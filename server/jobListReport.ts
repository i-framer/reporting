import { executeMySQLWithParams } from "./mysql";
import type { FramerCtx } from "./framerDashboard";

export type SaleTypeFilter = "orders_invoices" | "orders" | "invoices" | "quotes" | "all";
export type CompletionFilter = "incomplete" | "complete" | "all";
export type CollectionFilter = "uncollected" | "collected" | "all";
export type DateTypeFilter = "created" | "due";
export type OrderByField = "created" | "due" | "number" | "customer" | "description";
export type OrderDir = "asc" | "desc";

export interface JobListFilters {
  saleType: SaleTypeFilter;
  completion: CompletionFilter;
  collection: CollectionFilter;
  startDate: string;
  endDate: string;
  dateType: DateTypeFilter;
  orderBy: OrderByField;
  orderDir: OrderDir;
  includeHidden: boolean;
  includeAmounts: boolean;
}

function isValidDate(d: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(d);
}

export async function runJobList(config: any, ctx: FramerCtx, filters: JobListFilters) {
  const { saleType, completion, collection, startDate, endDate, dateType, orderBy, orderDir, includeHidden, includeAmounts } = filters;
  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    throw new Error("Invalid date range");
  }

  let saleTypeCondition = "";
  if (saleType === "orders_invoices") saleTypeCondition = "AND s.SaleType IN (1, 2)";
  else if (saleType === "orders") saleTypeCondition = "AND s.SaleType = 1";
  else if (saleType === "invoices") saleTypeCondition = "AND s.SaleType = 2";
  else if (saleType === "quotes") saleTypeCondition = "AND s.SaleType = 0";

  let completionCondition = "";
  if (completion === "incomplete") completionCondition = "AND j.Completed = 0";
  else if (completion === "complete") completionCondition = "AND j.Completed = 1";

  let collectionCondition = "";
  if (collection === "uncollected") collectionCondition = "AND j.Collected = 0";
  else if (collection === "collected") collectionCondition = "AND j.Collected = 1";

  const hiddenCondition = includeHidden ? "" : "AND (s.Hidden = 0 OR s.Hidden IS NULL)";

  // dateType and orderBy are mapped to fixed column names (never interpolated raw input).
  const dateCol = dateType === "due" ? "s.Due" : "s.Created";

  let orderClause = "s.Created";
  if (orderBy === "due") orderClause = "s.Due";
  else if (orderBy === "number") orderClause = "s.Number";
  else if (orderBy === "customer") orderClause = "p.FullName";
  else if (orderBy === "description") orderClause = "j.Description";

  const orderDirSql = orderDir === "desc" ? "DESC" : "ASC";

  const amountCols = includeAmounts ? `
    j.JobSubTotal AS SubTotal,
    j.JobTax AS Tax,
    j.JobTotal AS Total,` : "";

  // Build params in SQL text order: dates (WHERE, earlier) before framer scope (WHERE, later).
  const params: any[] = [];
  params.push(startDate, `${endDate} 23:59:59`);
  let framerClause: string;
  if (ctx.isAdmin) {
    framerClause = "1=1";
  } else {
    framerClause = "s.FramerID = ?";
    params.push(ctx.framerId);
  }

  const sql = `SELECT 
    CASE WHEN j.Completed = 1 THEN 'Complete' ELSE 'Open' END AS Status,
    CONCAT(f.SaleNumberPrefix, s.Number, '-', j.JobSalesNumber) AS Number,
    DATE_FORMAT(s.Due, '%d/%m/%Y') AS DueBy,
    j.Description,
    COALESCE(p.FullName, s.ContactName, '') AS Customer,
    COALESCE(o.TradingName, '') AS Company,
    j.Storage AS Location,
    GROUP_CONCAT(DISTINCT t.Name ORDER BY t.Name SEPARATOR ', ') AS Tags,
    ${amountCols}
    j.Copies,
    CASE WHEN j.Completed = 1 THEN 'Yes' ELSE '' END AS Complete,
    CASE WHEN j.Collected = 1 THEN 'Yes' ELSE '' END AS Collected
FROM job j
INNER JOIN sale s ON s.ID = j.SaleID AND s.Deleted = 0
INNER JOIN framer f ON f.ID = s.FramerID
LEFT JOIN customer c ON c.ID = s.CustomerID
LEFT JOIN profile pr ON pr.ID = c.ID
LEFT JOIN person p ON p.ID = pr.PersonID
LEFT JOIN organisation o ON o.ID = p.OrganisationID
LEFT JOIN jobtags jt ON jt.JobId = j.ID
LEFT JOIN tag t ON t.ID = jt.TagID AND t.Deleted = 0
WHERE j.Deleted = 0
  ${saleTypeCondition}
  ${completionCondition}
  ${collectionCondition}
  ${hiddenCondition}
  AND ${dateCol} >= ? AND ${dateCol} <= ?
  AND ${framerClause}
GROUP BY j.ID, f.SaleNumberPrefix, s.Number, j.JobSalesNumber, j.Description,
    p.FullName, s.ContactName, o.TradingName, j.Storage, j.Completed, j.Collected, j.Copies,
    s.Due, s.Created, j.JobSubTotal, j.JobTax, j.JobTotal
ORDER BY ${orderClause} ${orderDirSql}
LIMIT 1000`;

  return executeMySQLWithParams(config, sql, params);
}
