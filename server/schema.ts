import { executeMySQL } from "./mysql";

// In-memory cache of the introspected schema text, keyed by host+database.
// The schema rarely changes, so we cache it to avoid re-querying INFORMATION_SCHEMA
// on every AI request.
const schemaCache = new Map<string, { text: string; expires: number }>();
const SCHEMA_TTL_MS = 10 * 60 * 1000; // 10 minutes

function cacheKey(config: any): string {
  return `${config?.host}:${config?.port}:${config?.database}`;
}

/**
 * Build a compact, accurate schema description straight from the live database.
 * Format: one line per table -> "TABLE name: col1 (type), col2 (type), ..."
 */
export async function getLiveSchemaText(config: any, forceRefresh = false): Promise<string> {
  const key = cacheKey(config);
  const cached = schemaCache.get(key);
  if (!forceRefresh && cached && cached.expires > Date.now()) {
    return cached.text;
  }

  const sql = `
    SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    ORDER BY TABLE_NAME, ORDINAL_POSITION
  `;

  const result = await executeMySQL(config, sql, 30000);

  const tables = new Map<string, string[]>();
  for (const row of result.rows as any[]) {
    const table = row.TABLE_NAME as string;
    const col = `${row.COLUMN_NAME} (${row.DATA_TYPE})`;
    if (!tables.has(table)) tables.set(table, []);
    tables.get(table)!.push(col);
  }

  const lines: string[] = [];
  for (const [table, cols] of Array.from(tables.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
    lines.push(`TABLE ${table}: ${cols.join(", ")}`);
  }

  const text = lines.join("\n");
  schemaCache.set(key, { text, expires: Date.now() + SCHEMA_TTL_MS });
  return text;
}

export function clearSchemaCache(): void {
  schemaCache.clear();
}
