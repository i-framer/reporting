import crypto from "node:crypto";
import type { RequestHandler, ErrorRequestHandler, Response } from "express";

const MAX_AGE_SECONDS = 300;
type Reason =
  | "malformed_parameters" | "timestamp_rejected" | "signature_mismatch"
  | "replay" | "missing_framer" | "missing_secret" | "data_source_failure"
  | "missing_data_source" | "database_failure" | "session_regenerate_failure"
  | "session_save_failure" | "session_load_failure" | "unexpected_failure" | "success";
export interface SsoDiagnostic {
  event: "portal_sso";
  reference: string;
  reason: Reason;
  clockDeltaSeconds?: number;
}
export interface SsoDependencies {
  getSecret: () => string | undefined;
  getDataSources: () => Promise<Array<{ config: unknown }>>;
  queryFramer: (config: unknown, sql: string, params: string[]) =>
    Promise<{ rows: unknown[] }>;
  now?: () => number;
  diagnostic?: (entry: SsoDiagnostic) => void;
}

const defaultDiagnostic = (entry: SsoDiagnostic) =>
  console.info(JSON.stringify(entry));

function reference(res: Response): string {
  // Generated here, never taken from caller-controlled headers or query strings.
  return res.locals.portalSsoReference ??= crypto.randomUUID();
}

export const ssoRequestContext: RequestHandler = (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-SSO-Reference", reference(res));
  next();
};

function reject(
  res: Response, diagnostic: (entry: SsoDiagnostic) => void,
  reason: Reason, status: number, clockDeltaSeconds?: number,
) {
  diagnostic({
    event: "portal_sso", reference: reference(res), reason,
    ...(clockDeltaSeconds === undefined ? {} : { clockDeltaSeconds }),
  });
  // No error objects, query values, identity, signature, or configuration in output.
  const message = status === 503 ? "Portal sign-in is not configured on this server."
    : status >= 500 ? "Sign-in failed. Please try again."
    : "Sign-in link is invalid or has expired. Please go back to the portal and click the reports link again.";
  return res.status(status).type("text/plain").send(`${message} Reference: ${reference(res)}`);
}

export function createSsoSessionErrorHandler(
  diagnostic = defaultDiagnostic,
): ErrorRequestHandler {
  return (_err, _req, res, _next) => {
    reject(res, diagnostic, "session_load_failure", 500);
  };
}

export function createPortalSsoHandler(deps: SsoDependencies): RequestHandler {
  const now = deps.now ?? Date.now;
  const diagnostic = deps.diagnostic ?? defaultDiagnostic;
  // Deliberately process-local, as before. A shared atomic store is needed for replicas.
  const usedLinks = new Map<string, number>();
  return async (req, res) => {
    const fail = (reason: Reason, status: number, delta?: number) =>
      reject(res, diagnostic, reason, status, delta);
    let stage: Reason = "unexpected_failure";
    try {
      const secret = deps.getSecret();
      if (!secret) return void fail("missing_secret", 503);
      const { framerId, ts, sig } = req.query;
      if (typeof framerId !== "string" || !framerId.trim() ||
          typeof ts !== "string" || !ts ||
          typeof sig !== "string" || !/^[a-fA-F0-9]{64}$/.test(sig)) {
        return void fail("malformed_parameters", 400);
      }
      if (!/^\d+$/.test(ts) || !Number.isSafeInteger(Number(ts))) {
        return void fail("timestamp_rejected", 401);
      }
      const tsNum = Number(ts);
      const nowSeconds = Math.floor(now() / 1000);
      const delta = nowSeconds - tsNum;
      if (Math.abs(delta) > MAX_AGE_SECONDS) {
        return void fail("timestamp_rejected", 401, delta);
      }
      const expected = crypto.createHmac("sha256", secret)
        .update(`${framerId}.${ts}`, "utf8").digest();
      if (!crypto.timingSafeEqual(expected, Buffer.from(sig, "hex"))) {
        return void fail("signature_mismatch", 401);
      }
      const currentTime = now();
      usedLinks.forEach((expiry, key) => {
        if (expiry < currentTime) usedLinks.delete(key);
      });
      // Hex case does not change signature bytes and must not bypass one-use checks.
      const key = sig.toLowerCase();
      if (usedLinks.has(key)) return void fail("replay", 401);
      // Include the whole final accepted second, even for future-dated valid links.
      // Reserve before any await; failures also consume the link.
      usedLinks.set(key, (tsNum + MAX_AGE_SECONDS + 1) * 1000);

      stage = "data_source_failure";
      const dataSource = (await deps.getDataSources())[0];
      if (!dataSource) return void fail("missing_data_source", 500);
      stage = "database_failure";
      const result = await deps.queryFramer(
        dataSource.config,
        "SELECT ID, Name FROM framer WHERE ID = ? AND Deleted = 0 LIMIT 1",
        [framerId],
      );
      if (!result.rows.length) return void fail("missing_framer", 401);
      const framer = result.rows[0] as { ID: string; Name: string };
      stage = "session_regenerate_failure";
      await new Promise<void>((resolve, reject) =>
        req.session.regenerate(err => err ? reject(err) : resolve()));
      req.session.framerId = framer.ID;
      req.session.framerName = framer.Name || "Unknown Framer";
      req.session.isAdmin = false;
      stage = "session_save_failure";
      await new Promise<void>((resolve, reject) =>
        req.session.save(err => err ? reject(err) : resolve()));
      diagnostic({ event: "portal_sso", reference: reference(res), reason: "success" });
      res.redirect("/");
    } catch {
      // Prevent express-session's end-of-response auto-save from authenticating
      // a request whose explicit save failed. Do not emit a new session cookie.
      if (stage === "session_save_failure") req.session = null as unknown as typeof req.session;
      fail(stage, 500);
    }
  };
}