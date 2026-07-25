---
name: AI assistant live schema injection
description: How the i-FRAMER AI SQL assistant gets schema knowledge, and why it must stay live not hardcoded.
---

# AI assistant live schema injection

The `/api/ai/ask` route builds its system prompt from TWO parts:
1. **Live schema** — pulled from `INFORMATION_SCHEMA.COLUMNS` at request time via `server/schema.ts` (`getLiveSchemaText`), cached in-memory 10 min keyed by host:port:database. Format: `TABLE name: col (type), ...`.
2. **Curated business rules** — non-obvious relationships/gotchas hardcoded in the prompt (see iframer-schema.md).

**Why:** the assistant originally had a hand-maintained schema list that was incomplete and wrong (missing country/SMS/CountryCode, listed nonexistent columns). It kept generating queries with invented columns and broken joins. Live introspection fixes this permanently.

**How to apply:**
- Never reintroduce a hardcoded column list — extend the curated *business rules* only (relationships, soft-delete conventions, gotchas), and let the live schema supply column names.
- Keep the two sections distinct in the prompt: raw schema = facts the DB knows; business rules = facts it doesn't.

## Known open risk (not yet fixed)
Non-admin framer access enforcement on `/api/mysql/execute` and the AI path is **heuristic/substring-based** (checks a small table set sale/customer/saleline/job for FramerID presence). It is NOT deny-by-default and does not prove row-level restriction. Injecting the full 131-table schema makes table discovery easier for non-admins. A robust fix needs an allowlist/AST-based SQL authorizer — flagged to user, not yet implemented.
