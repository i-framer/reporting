import pg from "pg";
import { readFile } from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";
import { pathToFileURL } from "node:url";

export function validateBundle(bundle) {
  if (bundle.formatVersion !== 1 || !bundle.dataSourceName ||
      !Array.isArray(bundle.queries) || !Array.isArray(bundle.dashboards)) {
    throw new Error("Invalid report package.");
  }
  const unique = (items, key) => {
    const names = items.map(item => item[key]);
    if (names.some(name => !name) || new Set(names).size !== names.length) {
      throw new Error(`Missing or duplicate ${key} in package.`);
    }
  };
  unique(bundle.queries, "name");
  unique(bundle.dashboards, "name");
  const names = new Set(bundle.queries.map(q => q.name));
  for (const q of bundle.queries) {
    if (!/^\s*SELECT\b/i.test(q.sql)) throw new Error(`Review query: ${q.name}`);
  }
  for (const d of bundle.dashboards) {
    if (!Array.isArray(d.widgets)) throw new Error(`Invalid dashboard: ${d.name}`);
    unique(d.widgets, "title");
    for (const w of d.widgets) {
      if (!names.has(w.queryName) || !["table", "bar", "line", "pie", "single_value"].includes(w.type) ||
          !w.config || !w.layout) throw new Error(`Invalid widget: ${w.title}`);
    }
  }
}

function one(rows, name) {
  if (rows.length > 1) throw new Error(`Duplicate target records: ${name}. Resolve before importing.`);
  return rows[0];
}

// SELECT-only planning. No report SQL is executed and no source config is read.
export async function planImport(client, bundle) {
  validateBundle(bundle);
  const source = one((await client.query(
    "SELECT id FROM data_sources WHERE name=$1 AND type='mysql'",
    [bundle.dataSourceName],
  )).rows, bundle.dataSourceName);
  if (!source) throw new Error("Live MySQL data source is missing. Configure it in the app first.");
  const plan = { sourceId: source.id, queries: [], dashboards: [] };
  for (const q of bundle.queries) {
    const row = one((await client.query(
      "SELECT id, description, sql, data_source_id FROM saved_queries WHERE name=$1", [q.name],
    )).rows, q.name);
    if (row && (row.sql !== q.sql || row.description !== q.description ||
        row.data_source_id !== source.id)) {
      throw new Error(`Conflicting Live query: ${q.name}. Nothing will be overwritten.`);
    }
    plan.queries.push({ ...q, id: row?.id });
  }
  for (const d of bundle.dashboards) {
    const row = one((await client.query(
      "SELECT id, description FROM dashboards WHERE name=$1", [d.name],
    )).rows, d.name);
    if (row && row.description !== d.description) {
      throw new Error(`Conflicting Live dashboard: ${d.name}. Nothing will be overwritten.`);
    }
    const widgets = [];
    for (const w of d.widgets) {
      const existing = row ? one((await client.query(
        "SELECT r.id, r.type, r.config, r.layout, q.name AS query_name FROM reports r JOIN saved_queries q ON q.id=r.query_id WHERE r.dashboard_id=$1 AND r.title=$2",
        [row.id, w.title],
      )).rows, `${d.name} / ${w.title}`) : undefined;
      if (existing && (existing.query_name !== w.queryName || existing.type !== w.type ||
          !isDeepStrictEqual(existing.config, w.config) || !isDeepStrictEqual(existing.layout, w.layout))) {
        throw new Error(`Conflicting Live widget: ${d.name} / ${w.title}. Nothing will be overwritten.`);
      }
      widgets.push({ ...w, id: existing?.id });
    }
    plan.dashboards.push({ ...d, id: row?.id, widgets });
  }
  return plan;
}

// Called only within the CLI's transaction after a successful conflict check.
export async function applyPlan(client, plan) {
  const queryIds = new Map();
  for (const q of plan.queries) {
    let id = q.id;
    if (id == null) {
      id = (await client.query(
        "INSERT INTO saved_queries (name, description, data_source_id, sql) VALUES ($1,$2,$3,$4) RETURNING id",
        [q.name, q.description, plan.sourceId, q.sql],
      )).rows[0].id;
    }
    queryIds.set(q.name, id);
  }
  for (const d of plan.dashboards) {
    let id = d.id;
    if (id == null) {
      id = (await client.query(
        "INSERT INTO dashboards (name, description) VALUES ($1,$2) RETURNING id",
        [d.name, d.description],
      )).rows[0].id;
    }
    for (const w of d.widgets) {
      if (w.id == null) await client.query(
        "INSERT INTO reports (dashboard_id, query_id, type, title, config, layout) VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb)",
        [id, queryIds.get(w.queryName), w.type, w.title, JSON.stringify(w.config), JSON.stringify(w.layout)],
      );
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some(a => !["--apply", "--confirm-live", "--validate"].includes(a))) {
    throw new Error("Usage: node scripts/import-live-admin-reports.mjs [--validate | --apply --confirm-live]");
  }
  const bundle = JSON.parse(await readFile(new URL("./data/live-admin-reports.json", import.meta.url), "utf8"));
  validateBundle(bundle);
  if (args.includes("--validate")) {
    if (args.length !== 1) throw new Error("--validate cannot be combined with other flags.");
    console.log(`Package valid: ${bundle.queries.length} queries, ${bundle.dashboards.length} dashboards.`);
    return;
  }
  const apply = args.includes("--apply");
  if (apply !== args.includes("--confirm-live")) throw new Error("Applying requires both --apply and --confirm-live.");
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL must be provided by the Live application's secure environment.");
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  let begun = false;
  try {
    await client.connect();
    await client.query(apply ? "BEGIN" : "BEGIN READ ONLY");
    begun = true;
    await client.query("SET LOCAL lock_timeout = '5s'");
    await client.query("SET LOCAL statement_timeout = '30s'");
    if (apply) await client.query("LOCK TABLE data_sources, saved_queries, dashboards, reports IN SHARE ROW EXCLUSIVE MODE");
    const plan = await planImport(client, bundle);
    for (const q of plan.queries) console.log(`${q.id == null ? "ADD" : "KEEP"} query: ${q.name}`);
    for (const d of plan.dashboards) {
      console.log(`${d.id == null ? "ADD" : "KEEP"} dashboard: ${d.name}`);
      for (const w of d.widgets) console.log(`  ${w.id == null ? "ADD" : "KEEP"} widget: ${w.title}`);
    }
    if (apply) {
      await applyPlan(client, plan);
      await client.query("COMMIT");
      begun = false;
      console.log("Import committed. No existing definitions or data source settings were overwritten.");
    } else {
      await client.query("ROLLBACK");
      begun = false;
      console.log("Dry run complete. No records changed.");
    }
  } finally {
    if (begun) await client.query("ROLLBACK").catch(() => {});
    await client.end().catch(() => {});
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    // Do not print connection strings, stacks, SQL payloads or credentials.
    console.error(error.code ? `Database operation failed (${error.code}). Check the target and permissions.` : error.message);
    process.exitCode = 1;
  });
}
