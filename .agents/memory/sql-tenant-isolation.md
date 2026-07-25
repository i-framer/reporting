---
name: SQL tenant isolation for framers
description: Why string-based placeholder scoping cannot secure user-submitted SQL, and the safe pattern for framer (per-FramerID) data access.
---

# Tenant isolation for framer-scoped data

**Rule:** Never enforce per-tenant (FramerID) row scoping by string-matching or
substituting a placeholder inside SQL that an untrusted user can submit.

**Why:** The `/api/mysql/execute` framer path checks only "SQL is read-only" +
"`{{FRAMER_ID}}` placeholder is present", then string-replaces the placeholder.
A framer can satisfy both checks while defeating the scope, e.g.:
- placeholder hidden in a comment: `SELECT * FROM sale WHERE 1=1 -- {{FRAMER_ID}}`
- tautology: `... WHERE FramerID='{{FRAMER_ID}}' OR 1=1`
- placeholder in the SELECT list instead of a filter.
Regex/parser hardening (reject comments, require a `FramerID='...'` predicate)
narrows but cannot close this — `OR`-clauses and equivalent rewrites still leak
cross-tenant rows. Conclusion: do not accept raw SQL from framers at all.

**Safe pattern (used by the framer dashboard):** build the SQL server-side and
inject the FramerID as a **bound parameter**, never from the request body. See
`server/framerDashboard.ts` `scope(ctx, alias, params)` — admins get `1=1`,
framers get `alias.FramerID = ?` with `ctx.framerId` pushed onto the bind array,
executed via `executeMySQLWithParams` (prepared protocol). FramerID comes from
the authenticated session (`getFramerContext`), not the client.

**How to apply:** any new framer-reachable data path must either (a) run an
admin-authored query by stored ID with server-side scoping, or (b) be a
server-built parameterized query like the dashboard. The `/api/mysql/execute`
bypass is now CLOSED: execute is admin-only (`requireAdmin`); framer report
pages (cutting-list, job-list) POST validated enum/date filters to server-built
parameterized endpoints; dashboard widgets run admin-saved queries by id.

**metadata leak caveat:** scoping the *data* is not enough — list/get endpoints
leak *metadata*. Dashboards are categorized only by a `[admin]`/`[framer]`/`[items]`
prefix in their `description`, filtered CLIENT-side in dashboard-category.tsx. The
server `dashboards.list` / `dashboards.get` / `dashboards.getReports` endpoints must
ALSO filter by role (non-admins see only `[framer]` dashboards; otherwise 404),
or framers can enumerate admin dashboard names + widget titles + query IDs via the
raw API even though they can't run the queries. Same principle applies to
`queries.list`/`queries.get` (already filtered via `getFramerScopedSql`).

**run-by-id caveat:** saved-query SQL is admin-authored, but the framer branch of
`/api/queries/:id/run` (and the list/get visibility filters) must still gate on
the EXECUTABLE SQL containing a real `FramerID = '{{FRAMER_ID}}'` predicate —
strip comments first (`getFramerScopedSql`), because a bare/commented placeholder
is the same bypass class. When substituting the framerId, replace only the quoted
placeholder value (`{{FRAMER_ID}}` → the id) so the table alias (`s.FramerID`) is
preserved; rewriting the whole predicate drops the alias and causes "Column
'FramerID' in where clause is ambiguous" on multi-table joins.
