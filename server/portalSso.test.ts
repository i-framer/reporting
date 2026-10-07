import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import express, { type Express } from "express";
import session from "express-session";
import crypto from "node:crypto";
import {
  createPortalSsoHandler,
  createSsoSessionErrorHandler,
  ssoRequestContext,
  type SsoDiagnostic,
  type SsoDependencies,
} from "./portalSso";

const SECRET = "synthetic-portal-secret-only";
const FRAMER_ID = "synthetic-framer-42";
const FRAMER_NAME = "Synthetic Framer";
const BASE_SECONDS = 1_700_000_000;
const BASE_NOW = BASE_SECONDS * 1000;
const SQL = "SELECT ID, Name FROM framer WHERE ID = ? AND Deleted = 0 LIMIT 1";

function signature(
  framerId = FRAMER_ID,
  timestamp = String(BASE_SECONDS),
  secret = SECRET,
) {
  return crypto.createHmac("sha256", secret)
    .update(`${framerId}.${timestamp}`, "utf8").digest("hex");
}

function validQuery(
  framerId = FRAMER_ID,
  timestamp = String(BASE_SECONDS),
  secret = SECRET,
) {
  return `framerId=${encodeURIComponent(framerId)}&ts=${encodeURIComponent(timestamp)}&sig=${signature(framerId, timestamp, secret)}`;
}

type StoreCallback = (error?: any) => void;

/**
 * A deliberately small store used only to exercise express-session's error
 * paths. It does not connect to a database.
 */
class FaultStore extends session.Store {
  readonly sessions = new Map<string, session.SessionData>();
  loadError: Error | undefined;
  destroyError: Error | undefined;
  saveError: Error | undefined;

  get(sid: string, callback: (error: any, session?: session.SessionData | null) => void) {
    if (this.loadError) return callback(this.loadError);
    return callback(null, this.sessions.get(sid) ?? null);
  }

  set(sid: string, value: session.SessionData, callback: StoreCallback) {
    if (this.saveError) return callback(this.saveError);
    this.sessions.set(sid, value);
    return callback();
  }

  destroy(sid: string, callback: StoreCallback) {
    if (this.destroyError) return callback(this.destroyError);
    this.sessions.delete(sid);
    return callback();
  }

  touch(sid: string, _value: session.SessionData, callback: StoreCallback) {
    return callback();
  }
}

interface HarnessOptions {
  queryParser?: "simple" | "extended";
  store?: session.Store;
  secret?: string;
  now?: () => number;
  getSecret?: () => string | undefined;
  getDataSources?: () => Promise<Array<{ config: unknown }>>;
  queryFramer?: SsoDependencies["queryFramer"];
}

interface Harness {
  app: Express;
  diagnostics: SsoDiagnostic[];
  store: session.Store;
  queryCalls: Array<{ config: unknown; sql: string; params: string[] }>;
}

function makeHarness(options: HarnessOptions = {}): Harness {
  const app = express();
  if (options.queryParser) app.set("query parser", options.queryParser);
  const diagnostics: SsoDiagnostic[] = [];
  const queryCalls: Harness["queryCalls"] = [];
  const store = options.store ?? new session.MemoryStore();
  const getDataSources = options.getDataSources ??
    (async () => [{ config: { source: "synthetic-first" } }]);
  const queryFramer = options.queryFramer ?? (async (
    config: unknown,
    sql: string,
    params: string[],
  ) => {
    queryCalls.push({ config, sql, params });
    return { rows: [{ ID: FRAMER_ID, Name: FRAMER_NAME }] };
  });

  // Keep this ordering in lockstep with customAuth: context first, then the
  // session middleware, then the SSO-specific session error handler.
  app.use("/api/auth/sso", ssoRequestContext);
  app.use(session({
    store,
    secret: options.secret ?? "synthetic-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, secure: false },
  }));
  app.use("/api/auth/sso", createSsoSessionErrorHandler((entry) => {
    diagnostics.push(entry);
  }));
  app.get("/api/auth/sso", createPortalSsoHandler({
    getSecret: options.getSecret ?? (() => SECRET),
    getDataSources,
    queryFramer,
    now: options.now ?? (() => BASE_NOW),
    diagnostic: (entry) => diagnostics.push(entry),
  }));
  app.get("/who", (req, res) => res.json({
    framerId: req.session.framerId ?? null,
    framerName: req.session.framerName ?? null,
    isAdmin: req.session.isAdmin ?? false,
  }));
  app.get("/seed", (req, res) => {
    req.session.framerId = "old-session-id";
    req.session.framerName = "Old Session";
    req.session.isAdmin = true;
    req.session.save((error) => error ? res.status(500).send("seed failed") : res.send("ok"));
  });
  return { app, diagnostics, store, queryCalls };
}

interface HttpResponse {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: string;
}

async function request(app: Express, path: string, headers: Record<string, string> = {}): Promise<HttpResponse> {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  try {
    return await new Promise<HttpResponse>((resolve, reject) => {
      const req = http.request({
        hostname: "127.0.0.1",
        port: address.port,
        path,
        method: "GET",
        headers,
      }, (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => resolve({
          status: res.statusCode ?? 0,
          headers: res.headers,
          body: Buffer.concat(chunks).toString("utf8"),
        }));
      });
      req.on("error", reject);
      req.end();
    });
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

function cookieFrom(response: HttpResponse): string {
  const value = response.headers["set-cookie"]?.[0];
  assert.ok(value, "expected a session cookie");
  return value.split(";", 1)[0];
}

function assertSafeFailure(
  response: HttpResponse,
  diagnostics: SsoDiagnostic[],
  sensitive: string[] = [],
) {
  assert.ok(response.headers["x-sso-reference"]);
  const reference = response.headers["x-sso-reference"];
  assert.match(response.body, new RegExp(`Reference: ${reference}`));
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0].reference, reference);
  const visible = `${response.body}\n${JSON.stringify(diagnostics[0])}`;
  for (const value of sensitive) assert.equal(visible.includes(value), false, `leaked ${value}`);
  assert.equal(response.headers["cache-control"], "no-store");
  assert.equal(response.headers["referrer-policy"], "no-referrer");
  return diagnostics[0];
}

test("accepts a valid link, regenerates fixation-prone sessions, and persists a non-admin identity", async () => {
  const harness = makeHarness();
  const oldResponse = await request(harness.app, "/seed");
  const oldCookie = cookieFrom(oldResponse);
  const response = await request(harness.app, `/api/auth/sso?${validQuery()}`, {
    cookie: oldCookie,
  });
  assert.equal(response.status, 302);
  assert.equal(response.headers.location, "/");
  const newCookie = cookieFrom(response);
  assert.notEqual(newCookie, oldCookie);
  assert.deepEqual(harness.queryCalls, [{
    config: { source: "synthetic-first" },
    sql: SQL,
    params: [FRAMER_ID],
  }]);
  assert.deepEqual((await request(harness.app, "/who", { cookie: newCookie })).body, JSON.stringify({
    framerId: FRAMER_ID,
    framerName: FRAMER_NAME,
    isAdmin: false,
  }));
  assert.equal(harness.diagnostics.length, 1);
  assert.equal(harness.diagnostics[0].reason, "success");
  assert.equal(harness.diagnostics[0].reference, response.headers["x-sso-reference"]);
  assert.equal(response.headers["cache-control"], "no-store");
  assert.equal(response.headers["referrer-policy"], "no-referrer");
  assert.equal(`${response.body}\n${JSON.stringify(harness.diagnostics[0])}`.includes(SECRET), false);
  assert.equal(`${response.body}\n${JSON.stringify(harness.diagnostics[0])}`.includes(signature()), false);
  assert.equal(`${response.body}\n${JSON.stringify(harness.diagnostics[0])}`.includes(FRAMER_NAME), false);
});

test("rejects missing, empty, array, object, and non-string query parameters with extended parsing", async () => {
  const validSignature = signature();
  const cases = [
    `ts=${BASE_SECONDS}&sig=${validSignature}`,
    `framerId=&ts=${BASE_SECONDS}&sig=${validSignature}`,
    `framerId[]=x&ts=${BASE_SECONDS}&sig=${validSignature}`,
    `framerId[a]=x&ts=${BASE_SECONDS}&sig=${validSignature}`,
    `framerId=${FRAMER_ID}&ts[]=${BASE_SECONDS}&sig=${validSignature}`,
    `framerId=${FRAMER_ID}&ts[a]=${BASE_SECONDS}&sig=${validSignature}`,
    `framerId=${FRAMER_ID}&ts=${BASE_SECONDS}&sig[]=${validSignature}`,
    `framerId=${FRAMER_ID}&ts=${BASE_SECONDS}&sig[a]=${validSignature}`,
    `framerId=${FRAMER_ID}&ts=${BASE_SECONDS}&sig=`,
    `framerId=${FRAMER_ID}&sig=${validSignature}`,
    `framerId=${FRAMER_ID}&ts=${BASE_SECONDS}`,
  ];
  for (const query of cases) {
    const harness = makeHarness({ queryParser: "extended" });
    const response = await request(harness.app, `/api/auth/sso?${query}`);
    assert.equal(response.status, 400, query);
    assert.equal(assertSafeFailure(response, harness.diagnostics).reason, "malformed_parameters");
  }
});

test("rejects repeated scalar parameters with the default simple query parser", async () => {
  const validSignature = signature();
  const cases = [
    `framerId=${FRAMER_ID}&framerId=${FRAMER_ID}&ts=${BASE_SECONDS}&sig=${validSignature}`,
    `framerId=${FRAMER_ID}&ts=${BASE_SECONDS}&ts=${BASE_SECONDS}&sig=${validSignature}`,
    `framerId=${FRAMER_ID}&ts=${BASE_SECONDS}&sig=${validSignature}&sig=${validSignature}`,
  ];
  for (const query of cases) {
    const harness = makeHarness({ queryParser: "simple" });
    const response = await request(harness.app, `/api/auth/sso?${query}`);
    assert.equal(response.status, 400, query);
    assert.equal(assertSafeFailure(response, harness.diagnostics).reason, "malformed_parameters");
  }
});

test("rejects bad signature lengths and trailing garbage before cryptographic comparison", async () => {
  for (const sig of ["", "a".repeat(63), "a".repeat(65), `${"a".repeat(64)}x`]) {
    const harness = makeHarness();
    const response = await request(harness.app,
      `/api/auth/sso?framerId=${FRAMER_ID}&ts=${BASE_SECONDS}&sig=${sig}`);
    assert.equal(response.status, 400);
    assert.equal(assertSafeFailure(response, harness.diagnostics, sig ? [sig] : []).reason, "malformed_parameters");
  }
});

test("accepts exactly +/-300 seconds and rejects +/-301, fractions, milliseconds, scientific, and invalid timestamps", async () => {
  const cases: Array<{ timestamp: string; status: number; reason: SsoDiagnostic["reason"]; delta?: number }> = [
    { timestamp: String(BASE_SECONDS - 300), status: 302, reason: "success" },
    { timestamp: String(BASE_SECONDS + 300), status: 302, reason: "success" },
    { timestamp: String(BASE_SECONDS - 301), status: 401, reason: "timestamp_rejected", delta: 301 },
    { timestamp: String(BASE_SECONDS + 301), status: 401, reason: "timestamp_rejected", delta: -301 },
    { timestamp: `${BASE_SECONDS}.5`, status: 401, reason: "timestamp_rejected" },
    { timestamp: String(BASE_NOW), status: 401, reason: "timestamp_rejected" },
    { timestamp: `1e${String(String(BASE_SECONDS).length - 1)}`, status: 401, reason: "timestamp_rejected" },
    { timestamp: "not-a-timestamp", status: 401, reason: "timestamp_rejected" },
  ];
  for (const item of cases) {
    const harness = makeHarness();
    const response = await request(harness.app,
      `/api/auth/sso?${validQuery(FRAMER_ID, item.timestamp)}`);
    assert.equal(response.status, item.status, item.timestamp);
    assert.equal(harness.diagnostics[0].reason, item.reason);
    if (item.delta !== undefined) assert.equal(harness.diagnostics[0].clockDeltaSeconds, item.delta);
    if (item.status !== 302) {
      assertSafeFailure(response, harness.diagnostics, [signature(FRAMER_ID, item.timestamp)]);
    }
  }
});

test("canonicalizes signature case for one-use replay and expires future-issued links", async () => {
  let currentNow = BASE_NOW;
  const harness = makeHarness({ now: () => currentNow });
  const lower = signature(FRAMER_ID, String(BASE_SECONDS));
  const first = await request(harness.app,
    `/api/auth/sso?framerId=${FRAMER_ID}&ts=${BASE_SECONDS}&sig=${lower.toUpperCase()}`);
  assert.equal(first.status, 302);
  const replay = await request(harness.app,
    `/api/auth/sso?framerId=${FRAMER_ID}&ts=${BASE_SECONDS}&sig=${lower}`);
  assert.equal(replay.status, 401);
  assert.notEqual(first.headers["x-sso-reference"], replay.headers["x-sso-reference"]);
  assert.equal(assertSafeFailure(replay, harness.diagnostics.slice(1), [lower]).reason, "replay");

  currentNow = BASE_NOW;
  const futureTimestamp = String(BASE_SECONDS + 300);
  const futureSig = signature(FRAMER_ID, futureTimestamp);
  const future = await request(harness.app,
    `/api/auth/sso?${validQuery(FRAMER_ID, futureTimestamp)}`);
  assert.equal(future.status, 302);
  currentNow = BASE_NOW + 361_000;
  const futureReplay = await request(harness.app,
    `/api/auth/sso?framerId=${FRAMER_ID}&ts=${futureTimestamp}&sig=${futureSig}`);
  assert.equal(futureReplay.status, 401);
  assert.notEqual(future.headers["x-sso-reference"], futureReplay.headers["x-sso-reference"]);
  assert.equal(futureReplay.body.includes(futureSig), false);
  assert.equal(harness.diagnostics.at(-1)?.reason, "replay");
  currentNow = BASE_NOW + 600_999;
  const finalReplay = await request(harness.app,
    `/api/auth/sso?framerId=${FRAMER_ID}&ts=${futureTimestamp}&sig=${futureSig}`);
  assert.equal(finalReplay.status, 401);
  assert.notEqual(futureReplay.headers["x-sso-reference"], finalReplay.headers["x-sso-reference"]);
  assert.equal(harness.diagnostics.at(-1)?.reason, "replay");
  currentNow = BASE_NOW + 601_001;
  const expired = await request(harness.app,
    `/api/auth/sso?framerId=${FRAMER_ID}&ts=${futureTimestamp}&sig=${futureSig}`);
  assert.equal(expired.status, 401);
  assert.equal(harness.diagnostics.at(-1)?.reason, "timestamp_rejected");
  const references = [
    first.headers["x-sso-reference"],
    replay.headers["x-sso-reference"],
    future.headers["x-sso-reference"],
    futureReplay.headers["x-sso-reference"],
    finalReplay.headers["x-sso-reference"],
    expired.headers["x-sso-reference"],
  ];
  assert.equal(new Set(references).size, references.length);
});

test("rejects tampered and wrong-secret signatures without exposing identity or secret", async () => {
  const sensitive = [SECRET, FRAMER_ID, FRAMER_NAME, "synthetic-wrong-secret", signature()];
  const tampered = validQuery();
  const tamperedQuery = tampered.replace(`framerId=${FRAMER_ID}`, "framerId=synthetic-tampered");
  const first = makeHarness();
  const tamperedResponse = await request(first.app, `/api/auth/sso?${tamperedQuery}`);
  assert.equal(tamperedResponse.status, 401);
  assert.equal(assertSafeFailure(tamperedResponse, first.diagnostics, sensitive).reason, "signature_mismatch");

  const second = makeHarness({ getSecret: () => "synthetic-wrong-secret" });
  const wrongSecretResponse = await request(second.app, `/api/auth/sso?${validQuery()}`);
  assert.equal(wrongSecretResponse.status, 401);
  assert.equal(assertSafeFailure(wrongSecretResponse, second.diagnostics, sensitive).reason, "signature_mismatch");
});

test("queries only the first source with the deleted-row predicate and bound identity", async () => {
  const deletedId = "synthetic-deleted-framer";
  const activeId = "synthetic-active-framer";
  const unknownId = "synthetic-unknown-framer";
  const fixtures = [
    { ID: deletedId, Name: "Synthetic Deleted Framer", Deleted: 1 },
    { ID: activeId, Name: "Synthetic Active Framer", Deleted: 0 },
  ];
  const queryCalls: Array<{ config: unknown; sql: string; params: string[] }> = [];
  const harness = makeHarness({
    getDataSources: async () => [
      { config: { name: "first" } },
      { config: { name: "second" } },
    ],
    queryFramer: async (config, sql, params) => {
      queryCalls.push({ config, sql, params });
      return {
        rows: fixtures.filter((fixture) =>
          fixture.ID === params[0] && sql === SQL && fixture.Deleted === 0,
        ),
      };
    },
  });
  const deletedResponse = await request(harness.app, `/api/auth/sso?${validQuery(deletedId)}`);
  assert.equal(deletedResponse.status, 401);
  assert.equal(assertSafeFailure(deletedResponse, harness.diagnostics).reason, "missing_framer");
  const unknownResponse = await request(harness.app, `/api/auth/sso?${validQuery(unknownId)}`);
  assert.equal(unknownResponse.status, 401);
  assert.equal(assertSafeFailure(unknownResponse, harness.diagnostics.slice(1)).reason, "missing_framer");
  const activeResponse = await request(harness.app, `/api/auth/sso?${validQuery(activeId)}`);
  assert.equal(activeResponse.status, 302);
  assert.deepEqual(queryCalls, [
    { config: { name: "first" }, sql: SQL, params: [deletedId] },
    { config: { name: "first" }, sql: SQL, params: [unknownId] },
    { config: { name: "first" }, sql: SQL, params: [activeId] },
  ]);
});

test("reports missing secret, missing source, source failures, and lookup failures safely", async () => {
  const cases: Array<{
    options: HarnessOptions;
    status: number;
    reason: SsoDiagnostic["reason"];
  }> = [
    { options: { getSecret: () => undefined }, status: 503, reason: "missing_secret" },
    { options: { getDataSources: async () => [] }, status: 500, reason: "missing_data_source" },
    {
      options: { getDataSources: async () => { throw new Error("RAW_DATA_SOURCE_FAILURE"); } },
      status: 500, reason: "data_source_failure",
    },
    {
      options: { queryFramer: async () => { throw new Error("RAW_DATABASE_FAILURE SQL secret"); } },
      status: 500, reason: "database_failure",
    },
  ];
  for (const item of cases) {
    const harness = makeHarness(item.options);
    const response = await request(harness.app, `/api/auth/sso?${validQuery()}`);
    assert.equal(response.status, item.status);
    assert.equal(assertSafeFailure(response, harness.diagnostics, [
      SECRET, FRAMER_ID, FRAMER_NAME, "RAW_DATA_SOURCE_FAILURE", "RAW_DATABASE_FAILURE", SQL,
      signature(),
    ]).reason, item.reason);
  }
});

test("handles session load errors through the context-aware SSO error handler", async () => {
  const store = new FaultStore();
  const harness = makeHarness({ store });
  // Obtain a correctly signed cookie first; express-session skips store.get
  // for malformed/unsigned cookies, which would not exercise the load path.
  const seeded = await request(harness.app, "/seed");
  const cookie = cookieFrom(seeded);
  store.loadError = new Error("RAW_SESSION_LOAD_FAILURE");
  const response = await request(harness.app, `/api/auth/sso?${validQuery()}`, {
    cookie,
  });
  assert.equal(response.status, 500);
  assert.equal(assertSafeFailure(response, harness.diagnostics, [
    SECRET, FRAMER_ID, "RAW_SESSION_LOAD_FAILURE", signature(),
  ]).reason, "session_load_failure");
});

test("handles regenerate and save failures, and sends no cookie after a failed save", async () => {
  const regenerateStore = new FaultStore();
  regenerateStore.destroyError = new Error("RAW_REGENERATE_FAILURE");
  const regenerateHarness = makeHarness({ store: regenerateStore });
  const regenerated = await request(regenerateHarness.app, `/api/auth/sso?${validQuery()}`);
  assert.equal(regenerated.status, 500);
  assert.equal(assertSafeFailure(regenerated, regenerateHarness.diagnostics, [
    SECRET, FRAMER_ID, "RAW_REGENERATE_FAILURE", signature(),
  ]).reason, "session_regenerate_failure");

  const saveStore = new FaultStore();
  saveStore.saveError = new Error("RAW_SAVE_FAILURE");
  const saveHarness = makeHarness({ store: saveStore });
  const saved = await request(saveHarness.app, `/api/auth/sso?${validQuery()}`);
  assert.equal(saved.status, 500);
  assert.equal(saved.headers["set-cookie"], undefined);
  assert.equal(assertSafeFailure(saved, saveHarness.diagnostics, [
    SECRET, FRAMER_ID, "RAW_SAVE_FAILURE", signature(),
  ]).reason, "session_save_failure");
});

test("does not permit concurrent requests with the same link to authenticate twice", async () => {
  let releaseLookup: (() => void) | undefined;
  const lookupReady = new Promise<void>((resolve) => { releaseLookup = resolve; });
  let lookupStarted = 0;
  const harness = makeHarness({
    queryFramer: async (config, sql, params) => {
      lookupStarted++;
      await lookupReady;
      return { rows: [{ ID: FRAMER_ID, Name: FRAMER_NAME }] };
    },
  });
  const query = `/api/auth/sso?${validQuery()}`;
  const firstPromise = request(harness.app, query);
  while (lookupStarted === 0) await new Promise((resolve) => setImmediate(resolve));
  const second = await request(harness.app, query);
  assert.equal(second.status, 401);
  assert.equal(harness.diagnostics.at(-1)?.reason, "replay");
  assert.ok(releaseLookup);
  releaseLookup();
  const first = await firstPromise;
  assert.equal(first.status, 302);
  assert.notEqual(first.headers["x-sso-reference"], second.headers["x-sso-reference"]);
  assert.equal(lookupStarted, 1);
});