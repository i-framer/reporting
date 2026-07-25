export function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) return "";
  let str = String(value);
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildCsv(
  columns: string[],
  rows: Record<string, unknown>[]
): string {
  return [
    columns.map(escapeCsvField).join(","),
    ...rows.map((row) =>
      columns.map((col) => escapeCsvField(row[col])).join(",")
    ),
  ].join("\n");
}
