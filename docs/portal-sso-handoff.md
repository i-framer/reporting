# Portal SSO handoff

This is an operational handoff for the reports link from the external portal
to DataDeck. It describes the contract to verify with the portal owner and the
checks to run before calling an incident resolved.

## Current incident posture

- **Resolved according to the user**, who reported “we fixed it” after the
  portal link-generation handoff. Closure is based on that confirmation.
- The user did not provide the underlying correction or deployed diagnostics.
  The root cause remains unspecified; do not attribute resolution to the
  receiver hardening or assume which external code/configuration changed.
- The agent did not deploy to AWS or change the external portal. Production
  sign-in and tenant/admin authorization were not independently verified here.
- The checklist below remains an operational reference for future incidents,
  not an outstanding request for the user to repeat a resolved investigation.

## SSO request contract

The portal sends a `GET` request to `/api/auth/sso` with three query
parameters:

| Parameter | Contract |
| --- | --- |
| `framerId` | One scalar value. The exact string is used in the signed message. |
| `ts` | One scalar, unsigned decimal integer containing Unix epoch seconds. |
| `sig` | One scalar, exactly 64 hexadecimal characters (the hex digest of HMAC-SHA256). |

The signature is:

```text
HMAC-SHA256(PORTAL_SSO_SECRET, UTF-8 bytes of "<framerId>.<ts>")
```

Important details:

1. The message is exactly `<framerId>.<ts>`, including the literal dot.
2. Both the secret and message are interpreted as UTF-8.
3. Do not trim, lowercase, decode-and-re-encode, canonicalize, or otherwise
   normalize `framerId` or `ts` before constructing the message. For example,
   leading zeroes in `ts`, if sent, are part of the signed message.
4. Treat each query parameter as scalar. An array/repeated parameter is not a
   valid substitute for a scalar value; do not stringify an array and sign that
   representation.
5. `ts` is accepted only when `abs(currentUnixSeconds - ts) <= 300`. The
   boundary is absolute and inclusive: exactly 300 seconds old or ahead is
   valid; anything beyond it is rejected.
6. The portal must generate a new link at click time when a link expires or has already
   been consumed. Because the HMAC is deterministic, two links for the same
   `framerId` and the same second are identical.

### Synthetic signing example

The following is intentionally synthetic. Its origin, identifier, timestamp,
and secret are examples only and must not be used in any environment:

```js
import crypto from "node:crypto";

const framerId = "example-only-framer";
const ts = "1700000000";
const secret = "example-only-secret";
const message = `${framerId}.${ts}`;
const sig = crypto
  .createHmac("sha256", Buffer.from(secret, "utf8"))
  .update(Buffer.from(message, "utf8"))
  .digest("hex"); // 64 hexadecimal characters

const link = new URL("https://reports.example.invalid/api/auth/sso");
link.searchParams.set("framerId", framerId);
link.searchParams.set("ts", ts);
link.searchParams.set("sig", sig);
// Navigate to link in the browser. Never log or share a real signed URL.
```

The example demonstrates signing; it does not establish a valid production
timestamp or provide a production origin, identifier, or secret.

## What the server does after signature verification

The current server path in `server/customAuth.ts` and `server/portalSso.ts`:

1. Requires `PORTAL_SSO_SECRET`.
2. Verifies the timestamp and HMAC.
3. Reserves the verified signature before any asynchronous work (failed lookups
   and session failures also consume it), then reads the first data source
   returned by `storage.getDataSources()`. The
   storage query has no ordering, so “first” is not a stable identity unless
   the owner verifies the application database contents and ordering behavior.
4. Uses that MySQL configuration to run:

   ```sql
   SELECT ID, Name
   FROM framer
   WHERE ID = ? AND Deleted = 0
   LIMIT 1
   ```

5. Regenerates and saves a PostgreSQL-backed session, then redirects to the
   reports application. The resulting session is non-admin and is scoped to
   the matched framer.

The seed path in `server/seed.ts` updates the first existing data source at
startup with `MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`,
and `MYSQL_PORT`; if none exists, it creates one. Thus startup environment
values can reseed/overwrite the first persisted data source. `mysql.ts`
connects using that configuration, and a missing MySQL database, denied
credentials, unreachable host, or timeout can fail the lookup even when SSO
signing is correct.

## Replay and deployment-memory constraint

SSO links are one-time-use within the running process. The replay map is
process-local memory, not shared storage: it is lost on restart and is not
shared between workers or replicas. The actual AWS process topology is unverified.
Therefore this replay check must not be treated as a durable, cross-instance
replay guarantee. The owner must confirm topology before relying on one-use
protection across the deployment.

For the intended replay behavior:

- Use a canonical lower-case signature as the replay key.
- Retain the key through the signed timestamp plus 300 seconds, inclusive of
  the validity boundary; prune it only after that boundary has passed.
- Do not use a request-time-plus-300 value as a substitute for the signed
  timestamp window.
- A same-second retry has the same signature and must be recognized as the
  same link within the process that consumed it.

## Safe diagnostics

The diagnostic reason vocabulary is deliberately explicit:

`malformed_parameters`, `timestamp_rejected`, `signature_mismatch`, `replay`,
`missing_framer`, `missing_secret`, `data_source_failure`,
`missing_data_source`, `database_failure`, `session_regenerate_failure`,
`session_save_failure`, `session_load_failure`, `unexpected_failure`, and
`success`.

Diagnostics should distinguish request validation, timestamp/HMAC checks,
replay, data-source selection, MySQL lookup, and session lifecycle failures.
They must not include the HMAC secret, session cookie, raw query string, or
other sensitive request material in logs or user-visible responses.

Each request gets a server-generated UUID in `X-SSO-Reference`; failures also
show it in the plain-text browser response. Find the JSON event with
`event: "portal_sso"` and that `reference` in authorized server logs. The event
contains only `event`, `reference`, `reason`, and, for out-of-window timestamps,
`clockDeltaSeconds` (receiver seconds minus supplied seconds). No raw exception,
SQL, framer identifier/name, or signed URL is recorded. Do not share browser
address bars, HAR exports, request headers, or full database errors.

| Reason | Owner action after confirming this branch |
| --- | --- |
| `malformed_parameters` | Send one nonblank `framerId`, one `ts`, and exactly 64 hex characters for `sig`; remove repeated/nested fields and malformed/trailing signature data. |
| `timestamp_rejected` | Send integer seconds, not milliseconds, fractions or scientific notation; synchronize clocks and generate links at click time, not page render/cache time. Positive delta means old, negative means ahead. Do not enlarge the window. |
| `signature_mismatch` | Compare secret-manager references/versions securely in portal and receiver, including all workers; verify UTF-8 HMAC-SHA256 and exact message bytes before URL encoding. Do not print either secret or computed signatures. |
| `replay` | Generate a fresh link in a new second; investigate prefetchers, scanners, double navigation or cached links. Do not retry the consumed URL or disable replay checks. |
| `missing_framer` | Privately verify the exact portal ID has a non-deleted row in the selected MySQL environment. Do not substitute another ID or database as a fallback. |
| `missing_secret` | Set the intended matching secret through the owner's approved secret-management channel and restart the correct receiver workers. |
| `data_source_failure` / `missing_data_source` | Check the app PostgreSQL connection and configured data sources, then startup seeding. |
| `database_failure` | Check private-network connectivity, selected MySQL database, credentials, grants and schema privately; keep raw errors out of shared logs. |
| `session_load_failure` / `session_regenerate_failure` / `session_save_failure` | Verify the PostgreSQL session store, existing `sessions` table and permissions. Then verify HTTPS proxy forwarding and cookies without sharing cookie values. |
| `unexpected_failure` | Investigate the deployed revision using the reference in restricted operational tooling; do not add raw request/error logging. |
| `success` | Signature, lookup and explicit session save succeeded; separately confirm the browser retains the cookie and reports load for the matching non-admin identity. |

## Owner checklist

The portal/deployment owner should complete these checks in order and record a
request reference for each authorized test:

- **Dev portal:** Point the portal's reports origin at the correct reports
  origin for the target environment. Confirm the portal uses the matching
  `PORTAL_SSO_SECRET`; do not paste the secret into tickets or logs.
  Specifically, confirm whether the reported dev portal at
  `https://thepictureframer.dev.i-framer.com/reporting` is intended to send users
  to `https://reporting.i-framer.co`. A hostname alone does not prove which
  environment its receiver serves. If not intended, the portal owner must change
  the destination and pair it with that environment's signing secret and database.
  The portal generator is outside this repository; no receiver bypass is appropriate.
- **Application data source:** Confirm the intended first data source exists.
  Storage retrieval is unordered, so verify there is no competing source that
  could be selected. Confirm startup reseeding environment variables point to
  that same source.
  Check all `MYSQL_*` values in the approved configuration system: absent values
  currently fall back to localhost/root/empty password/test_db/3306. Do not assume
  a persisted UI edit survives startup reseeding. Reports may prefer data-source
  ID 1 while SSO uses the unordered first result; ensure these resolve to the same
  intended environment. Do not change ordering or database selection blindly.
- **MySQL:** Confirm the configured database itself exists, credentials can
  connect, and the target `framer` row exists with `Deleted = 0`.
- **Clocks and click generation:** Check portal/server clock agreement. Generate
  a fresh click rather than replaying a copied URL, and verify the portal
  signs the exact UTF-8 message and scalar values described above.
- **Access logging:** Use sanitized access logs that retain timing, status,
  and a request reference, but do not retain query strings, referrers, cookies,
  HMACs, or secrets.
- **Fresh authorized test:** Perform one fresh authorized click, capture its
  reference and outcome, then verify the resulting non-admin user can see only
  the expected framer-scoped reports. Separately verify that admin-only
  reports remain unavailable to that user.
  First deploy this reviewed receiver change through the owner's approved AWS
  process; old deployed code will not emit these diagnostic references. Preserve
  only the UTC click time, reference, reason/outcome, deployed revision and
  non-sensitive environment labels as incident evidence. Do not deploy from this
  workspace or open private RDS access without separate approval.

The user subsequently confirmed resolution. The specific root cause and
correction remain undocumented; the checks above explain how to establish
them if a future investigation requires that evidence.

## Local verification (2026-09-17)

- `npm run test:sso`: all 12 test cases pass, with synthetic HTTP/session fixtures.
  Coverage includes non-admin identity persistence and session regeneration;
  malformed/repeated parameters; exact signature format; wrong secret and
  tampering; timestamp units and inclusive boundaries; concurrent and
  case-variant replay; future-link replay retention; missing/deleted framers;
  first-source parameterized lookup; data-source, database and session failures;
  and safe diagnostics.
- `npm run build`: passes. Existing bundle-size and outdated Browserslist
  warnings remain.
- `npm run check`: still fails with the same diagnostics captured before these
  changes, in `client/src/pages/dashboard-view.tsx`,
  `client/src/pages/query-report.tsx`, and server audio/batch/chat/image
  integration files. No new TypeScript diagnostics were introduced.
- Development workflow starts and serves port 5000. Browser inspection of
  `/api/auth/sso` without parameters shows the expected generic rejection with
  a reference (HTTP 400). No supplied signed link was copied or replayed.

Receiver hardening fixes observed in code: reject non-scalar query values and
malformed hex instead of coercing/truncating them; canonicalize signature
bytes for replay tracking; retain consumed future-dated links through their
entire accepted lifetime; redact operational failures, including session loads;
and prevent end-of-response auto-save after an explicit session-save failure.
These are not evidence of the reported live incident's cause.