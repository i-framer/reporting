import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { validateBundle, planImport, applyPlan } from "./import-live-admin-reports.mjs";

const bundle = JSON.parse(await readFile(new URL("./data/live-admin-reports.json", import.meta.url), "utf8"));
function fakeClient({ sourceRows = [{ id: 77 }], existingQuery } = {}) {
  const calls = [];
  let id = 100;
  return {
    calls,
    async query(sql, values = []) {
      calls.push({ sql, values });
      if (sql.includes("FROM data_sources")) return { rows: sourceRows };
      if (sql.includes("FROM saved_queries")) return { rows: existingQuery ? [existingQuery] : [] };
      if (sql.includes("FROM dashboards") || sql.includes("FROM reports")) return { rows: [] };
      if (sql.startsWith("INSERT")) return { rows: [{ id: ++id }] };
      throw new Error(`Unexpected SQL: ${sql}`);
    },
  };
}

test("export includes 13 queries and 5 dashboards/widgets with no source config or IDs", () => {
  validateBundle(bundle);
  assert.equal(bundle.queries.length, 13);
  assert.equal(bundle.dashboards.length, 5);
  assert.equal(bundle.dashboards.flatMap(d => d.widgets).length, 5);
  for (const q of bundle.queries) assert.deepEqual(Object.keys(q).sort(), ["description", "name", "sql"]);
  assert.equal("dataSources" in bundle, false);
});

test("dry-run planning uses only SELECT and maps source by name", async () => {
  const client = fakeClient();
  const plan = await planImport(client, bundle);
  assert.equal(plan.sourceId, 77);
  assert(client.calls.every(c => c.sql.startsWith("SELECT")));
  assert(client.calls.every(c => !c.sql.includes("config FROM data_sources")));
});

test("missing and ambiguous source fail before inserts", async () => {
  for (const rows of [[], [{ id: 1 }, { id: 2 }]]) {
    const client = fakeClient({ sourceRows: rows });
    await assert.rejects(planImport(client, bundle));
    assert(client.calls.every(c => !c.sql.startsWith("INSERT")));
  }
});

test("conflicting query fails rather than overwriting Live", async () => {
  const client = fakeClient({ existingQuery: { id: 2, sql: "SELECT 1", description: null, data_source_id: 77 } });
  await assert.rejects(planImport(client, bundle), /Conflicting Live query/);
  assert(client.calls.every(c => c.sql.startsWith("SELECT")));
});

test("apply uses fresh target IDs and never updates or deletes", async () => {
  const client = fakeClient();
  const plan = await planImport(client, bundle);
  await applyPlan(client, plan);
  const inserts = client.calls.filter(c => c.sql.startsWith("INSERT"));
  assert.equal(inserts.length, 23);
  assert(inserts.filter(c => c.sql.includes("saved_queries")).every(c => c.values[2] === 77));
  assert(inserts.filter(c => c.sql.includes("INSERT INTO reports")).every(c => c.values[0] > 100 && c.values[1] > 100));
  assert(client.calls.every(c => !/^(UPDATE|DELETE)/.test(c.sql)));
});

test("identical query is kept", async () => {
  const single = { ...bundle, queries: [bundle.queries[0]], dashboards: [] };
  const client = fakeClient({ existingQuery: { ...single.queries[0], id: 300, data_source_id: 77 } });
  const plan = await planImport(client, single);
  await applyPlan(client, plan);
  assert(client.calls.every(c => c.sql.startsWith("SELECT")));
});

test("invalid references and duplicate package names are rejected", () => {
  assert.throws(() => validateBundle({ ...bundle, queries: [bundle.queries[0], bundle.queries[0]] }));
  assert.throws(() => validateBundle({ ...bundle, queries: [] }));
});
