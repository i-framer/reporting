import { executeMySQLWithParams } from "./mysql";
import type { FramerCtx } from "./framerDashboard";

export type ItemTypeFilter = "moulding" | "matboard" | "covering" | "backing";
export type CompletionFilter = "incomplete" | "complete" | "all";
export type SaleTypeFilter = "orders_invoices" | "orders" | "invoices" | "quotes" | "all";

export interface CuttingListFilters {
  itemType: ItemTypeFilter;
  completion: CompletionFilter;
  saleType: SaleTypeFilter;
  startDate: string;
  endDate: string;
}

function isValidDate(d: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(d);
}

export async function runCuttingList(config: any, ctx: FramerCtx, filters: CuttingListFilters) {
  const { itemType, completion, saleType, startDate, endDate } = filters;
  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    throw new Error("Invalid date range");
  }

  let lineJoin = "";
  let extraJoin = "";
  let itemTypeLabel = "'Moulding'";
  let dimensionCols = "";
  let groupByCols = "";

  if (itemType === "moulding") {
    lineJoin = "INNER JOIN mouldingline ml ON ml.ID = sl.ID";
    extraJoin = "LEFT JOIN moulding m ON m.ID = i.ID";
    itemTypeLabel = "'Moulding'";
    dimensionCols = `CONCAT(ml.TotalWidth, 'mm x ', ml.TotalHeight, 'mm') AS InsideDimensions,
    CONCAT(
      ROUND(ml.TotalWidth + 2 * (COALESCE(m.Width, 0) - COALESCE(m.Rebate, 0))),
      'mm x ',
      ROUND(ml.TotalHeight + 2 * (COALESCE(m.Width, 0) - COALESCE(m.Rebate, 0))),
      'mm'
    ) AS OutsideDimensions,
    m.DefaultMouldingLength AS StockLengthMM,`;
    groupByCols = "ml.TotalWidth, ml.TotalHeight, m.Width, m.Rebate, m.DefaultMouldingLength,";
  } else if (itemType === "matboard") {
    lineJoin = "INNER JOIN matboardline mbl ON mbl.ID = sl.ID";
    itemTypeLabel = "'Matboard'";
    dimensionCols = `CONCAT(mbl.TotalWidth, 'mm x ', mbl.TotalHeight, 'mm') AS Dimensions,`;
    groupByCols = "mbl.TotalWidth, mbl.TotalHeight,";
  } else if (itemType === "covering") {
    lineJoin = "INNER JOIN coveringline cl ON cl.ID = sl.ID";
    itemTypeLabel = "'Covering'";
    dimensionCols = `CONCAT(cl.TotalWidth, 'mm x ', cl.TotalHeight, 'mm') AS Dimensions,`;
    groupByCols = "cl.TotalWidth, cl.TotalHeight,";
  } else if (itemType === "backing") {
    lineJoin = "INNER JOIN backingline bl ON bl.ID = sl.ID";
    itemTypeLabel = "'Backing'";
    dimensionCols = `CONCAT(bl.TotalWidth, 'mm x ', bl.TotalHeight, 'mm') AS Dimensions,`;
    groupByCols = "bl.TotalWidth, bl.TotalHeight,";
  } else {
    throw new Error("Invalid item type");
  }

  let saleTypeCondition = "";
  if (saleType === "orders_invoices") saleTypeCondition = "AND s.SaleType IN (1, 2)";
  else if (saleType === "orders") saleTypeCondition = "AND s.SaleType = 1";
  else if (saleType === "invoices") saleTypeCondition = "AND s.SaleType = 2";
  else if (saleType === "quotes") saleTypeCondition = "AND s.SaleType = 0";

  let completionCondition = "";
  if (completion === "incomplete") completionCondition = "AND sl.SaleCuttingListCompleted = 0";
  else if (completion === "complete") completionCondition = "AND sl.SaleCuttingListCompleted = 1";

  // Build params in SQL text order: dates (in JOIN) come before the framer scope (in WHERE).
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
    i.Code AS Code,
    i.Name AS ItemName,
    ${itemTypeLabel} AS ItemType,
    i.StorageLocation AS Bin,
    CONCAT(f.SaleNumberPrefix, s.Number) AS SaleNumber,
    COALESCE(p.FullName, s.ContactName, '') AS Customer,
    CASE s.SaleType 
      WHEN 0 THEN 'Quote'
      WHEN 1 THEN 'Order'
      WHEN 2 THEN 'Invoice'
      ELSE 'Other'
    END AS SaleType,
    SUM(sl.UsedQuantity) AS Qty,
    MAX(j.Copies) AS Copies,
    ${dimensionCols}
    CASE WHEN sl.SaleCuttingListCompleted = 1 THEN 'Yes' ELSE '' END AS Complete
FROM saleline sl
${lineJoin}
INNER JOIN item i ON i.ID = sl.ItemID AND i.Deleted = 0
${extraJoin}
INNER JOIN sale s ON s.ID = sl.SaleID AND s.Deleted = 0 ${saleTypeCondition}
    AND s.Created >= ? AND s.Created <= ?
INNER JOIN framer f ON s.FramerID = f.ID
LEFT JOIN customer cu ON cu.ID = s.CustomerID
LEFT JOIN profile pr ON pr.ID = cu.ID
LEFT JOIN person p ON p.ID = pr.PersonID
LEFT JOIN jobline jl ON jl.ID = sl.ID
LEFT JOIN job j ON j.ID = jl.JobID AND j.Deleted = 0
WHERE sl.Deleted = 0 
  ${completionCondition}
  AND ${framerClause}
GROUP BY i.Code, i.Name, i.StorageLocation,
    f.SaleNumberPrefix, s.Number, p.FullName, s.ContactName, s.SaleType,
    ${groupByCols}
    sl.SaleCuttingListCompleted
ORDER BY i.Code, s.Number
LIMIT 1000`;

  return executeMySQLWithParams(config, sql, params);
}
