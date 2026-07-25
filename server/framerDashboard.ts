import { executeMySQLWithParams } from "./mysql";

type DataSourceConfig = any;

export interface FramerCtx {
  isAdmin: boolean;
  framerId: string | null;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function toInt(val: any): number {
  if (val === null || val === undefined) return 0;
  return typeof val === "string" ? parseInt(val, 10) || 0 : Math.round(val);
}

function toFloat(val: any): number {
  const n = typeof val === "string" ? parseFloat(val) : val;
  return Number.isFinite(n) ? n : 0;
}

function isValidDate(d: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(d);
}

// Build the tenant-scoping predicate for a given table alias.
// Admins see everything (1=1); framers are restricted to their own FramerID,
// which is bound as a parameter (never taken from the client).
export function scope(ctx: FramerCtx, alias: string, params: any[]): string {
  if (ctx.isAdmin) return "1=1";
  params.push(ctx.framerId);
  return `${alias}.FramerID = ?`;
}

async function run(config: DataSourceConfig, sql: string, params: any[]): Promise<Record<string, any>[]> {
  const result = await executeMySQLWithParams(config, sql, params);
  return (result.rows as Record<string, any>[]) || [];
}

export async function getOverview(config: DataSourceConfig, ctx: FramerCtx) {
  const custParams: any[] = [];
  const custSql = `SELECT COUNT(*) as total FROM customer c WHERE ${scope(ctx, "c", custParams)}`;

  const jobParams: any[] = [];
  const jobSql = `SELECT 
    SUM(CASE WHEN j.Completed = 0 AND s.SaleType IN (1,2) THEN 1 ELSE 0 END) AS not_completed_count,
    COALESCE(SUM(CASE WHEN j.Completed = 0 AND s.SaleType IN (1,2) THEN j.JobTotal ELSE 0 END),0) AS not_completed_total,
    SUM(CASE WHEN j.Completed = 0 AND s.SaleType IN (1,2) AND s.Due < CURDATE() THEN 1 ELSE 0 END) AS overdue_count,
    COALESCE(SUM(CASE WHEN j.Completed = 0 AND s.SaleType IN (1,2) AND s.Due < CURDATE() THEN j.JobTotal ELSE 0 END),0) AS overdue_total,
    SUM(CASE WHEN j.Completed = 1 AND j.Collected = 0 AND s.SaleType IN (1,2) THEN 1 ELSE 0 END) AS completed_not_collected_count,
    COALESCE(SUM(CASE WHEN j.Completed = 1 AND j.Collected = 0 AND s.SaleType IN (1,2) THEN j.JobTotal ELSE 0 END),0) AS completed_not_collected_total,
    SUM(CASE WHEN j.Collected = 1 AND s.FullyPaid = 0 AND s.SaleType IN (1,2) THEN 1 ELSE 0 END) AS collected_not_paid_count,
    COALESCE(SUM(CASE WHEN j.Collected = 1 AND s.FullyPaid = 0 AND s.SaleType IN (1,2) THEN j.JobTotal ELSE 0 END),0) AS collected_not_paid_total
    FROM job j INNER JOIN sale s ON s.ID = j.SaleID AND s.Deleted = 0 AND (s.Hidden = 0 OR s.Hidden IS NULL)
    WHERE j.Deleted = 0 AND ${scope(ctx, "s", jobParams)}`;

  const [custRows, jobRows] = await Promise.all([
    run(config, custSql, custParams),
    run(config, jobSql, jobParams),
  ]);

  return {
    totalCustomers: toInt(custRows[0]?.total),
    smsRemaining: 200,
    notCompletedCount: toInt(jobRows[0]?.not_completed_count),
    notCompletedTotal: toFloat(jobRows[0]?.not_completed_total),
    overdueCount: toInt(jobRows[0]?.overdue_count),
    overdueTotal: toFloat(jobRows[0]?.overdue_total),
    completedNotCollectedCount: toInt(jobRows[0]?.completed_not_collected_count),
    completedNotCollectedTotal: toFloat(jobRows[0]?.completed_not_collected_total),
    collectedNotPaidCount: toInt(jobRows[0]?.collected_not_paid_count),
    collectedNotPaidTotal: toFloat(jobRows[0]?.collected_not_paid_total),
  };
}

export async function getToday(config: DataSourceConfig, ctx: FramerCtx) {
  const p1: any[] = [];
  const saleSql = `SELECT 
    COALESCE(SUM(CASE WHEN s.SaleType = 0 THEN 1 ELSE 0 END),0) AS new_quotes,
    COALESCE(SUM(CASE WHEN s.SaleType = 0 THEN s.SaleTotal ELSE 0 END),0) AS quotes_total,
    COALESCE(SUM(CASE WHEN s.SaleType = 1 THEN 1 ELSE 0 END),0) AS new_orders,
    COALESCE(SUM(CASE WHEN s.SaleType = 1 THEN s.SaleTotal ELSE 0 END),0) AS orders_total,
    COALESCE(SUM(CASE WHEN s.SaleType = 2 THEN 1 ELSE 0 END),0) AS new_invoices,
    COALESCE(SUM(CASE WHEN s.SaleType = 2 THEN s.SaleTotal ELSE 0 END),0) AS invoices_total
    FROM sale s WHERE s.Deleted = 0 AND ${scope(ctx, "s", p1)} AND DATE(s.Created) = CURDATE()`;

  const p2: any[] = [];
  const jobCompSql = `SELECT COUNT(*) as cnt, COALESCE(SUM(j.JobTotal),0) as total 
    FROM job j INNER JOIN sale s ON s.ID = j.SaleID AND s.Deleted = 0
    WHERE j.Deleted = 0 AND j.Completed = 1 AND ${scope(ctx, "s", p2)}
    AND DATE(j.SaleCuttingListCompletedDate) = CURDATE()`;

  const p3: any[] = [];
  const jobCollSql = `SELECT COUNT(*) as cnt, COALESCE(SUM(j.JobTotal),0) as total 
    FROM job j INNER JOIN sale s ON s.ID = j.SaleID AND s.Deleted = 0
    WHERE j.Deleted = 0 AND j.Collected = 1 AND ${scope(ctx, "s", p3)}
    AND DATE(j.DateAdded) = CURDATE()`;

  const p4: any[] = [];
  const paySql = `SELECT COALESCE(SUM(p.Amount),0) AS total_payments 
    FROM payment p INNER JOIN sale s ON s.ID = p.SaleID AND s.Deleted = 0
    WHERE p.Deleted = 0 AND ${scope(ctx, "s", p4)} AND DATE(p.PaymentDate) = CURDATE()`;

  const p5: any[] = [];
  const dueSql = `SELECT 
    COALESCE(SUM(CASE WHEN DATE(s.Due) = CURDATE() THEN 1 ELSE 0 END),0) AS due_today,
    COALESCE(SUM(CASE WHEN s.Due < CURDATE() THEN 1 ELSE 0 END),0) AS overdue
    FROM sale s INNER JOIN job j ON j.SaleID = s.ID AND j.Deleted = 0 AND j.Completed = 0
    WHERE s.Deleted = 0 AND s.SaleType IN (1,2) AND ${scope(ctx, "s", p5)} AND (s.Hidden = 0 OR s.Hidden IS NULL)`;

  const [saleRows, jobCompRows, jobCollRows, payRows, dueRows] = await Promise.all([
    run(config, saleSql, p1),
    run(config, jobCompSql, p2),
    run(config, jobCollSql, p3),
    run(config, paySql, p4),
    run(config, dueSql, p5),
  ]);

  return {
    newQuotes: toInt(saleRows[0]?.new_quotes),
    quotesTotal: toFloat(saleRows[0]?.quotes_total),
    newOrders: toInt(saleRows[0]?.new_orders),
    ordersTotal: toFloat(saleRows[0]?.orders_total),
    newInvoices: toInt(saleRows[0]?.new_invoices),
    invoicesTotal: toFloat(saleRows[0]?.invoices_total),
    jobsCompleted: toInt(jobCompRows[0]?.cnt),
    jobsCompletedTotal: toFloat(jobCompRows[0]?.total),
    jobsCollected: toInt(jobCollRows[0]?.cnt),
    jobsCollectedTotal: toFloat(jobCollRows[0]?.total),
    totalPayments: toFloat(payRows[0]?.total_payments),
    ordersDueToday: toInt(dueRows[0]?.due_today),
    ordersOverdue: toInt(dueRows[0]?.overdue),
  };
}

export async function getPeriod(config: DataSourceConfig, ctx: FramerCtx, from: string, to: string) {
  if (!isValidDate(from) || !isValidDate(to)) {
    throw new Error("Invalid date range");
  }
  const fromStart = from;
  const toEnd = `${to} 23:59:59`;

  const p1: any[] = [];
  const saleSql = `SELECT 
    COALESCE(SUM(CASE WHEN s.SaleType = 0 THEN 1 ELSE 0 END),0) AS quotes_count,
    COALESCE(SUM(CASE WHEN s.SaleType = 0 THEN s.SaleTotal ELSE 0 END),0) AS quotes_total,
    COALESCE(SUM(CASE WHEN s.SaleType = 1 THEN 1 ELSE 0 END),0) AS orders_count,
    COALESCE(SUM(CASE WHEN s.SaleType = 1 THEN s.SaleTotal ELSE 0 END),0) AS orders_total,
    COALESCE(SUM(CASE WHEN s.SaleType = 2 THEN 1 ELSE 0 END),0) AS invoices_count,
    COALESCE(SUM(CASE WHEN s.SaleType = 2 THEN s.SaleTotal ELSE 0 END),0) AS invoices_total
    FROM sale s WHERE s.Deleted = 0 AND ${scope(ctx, "s", p1)}
    AND s.Created >= ? AND s.Created <= ?`;
  p1.push(fromStart, toEnd);

  const p2: any[] = [];
  const compSql = `SELECT COUNT(*) as cnt, COALESCE(SUM(j.JobTotal),0) as total
    FROM job j INNER JOIN sale s ON s.ID = j.SaleID AND s.Deleted = 0
    WHERE j.Deleted = 0 AND j.Completed = 1 AND ${scope(ctx, "s", p2)}
    AND j.SaleCuttingListCompletedDate >= ? AND j.SaleCuttingListCompletedDate <= ?`;
  p2.push(fromStart, toEnd);

  const p3: any[] = [];
  const collSql = `SELECT COUNT(*) as cnt, COALESCE(SUM(j.JobTotal),0) as total
    FROM job j INNER JOIN sale s ON s.ID = j.SaleID AND s.Deleted = 0
    WHERE j.Deleted = 0 AND j.Collected = 1 AND ${scope(ctx, "s", p3)}
    AND j.DateAdded >= ? AND j.DateAdded <= ?`;
  p3.push(fromStart, toEnd);

  const p4: any[] = [];
  const paySql = `SELECT COALESCE(SUM(p.Amount),0) AS total_payments
    FROM payment p INNER JOIN sale s ON s.ID = p.SaleID AND s.Deleted = 0
    WHERE p.Deleted = 0 AND ${scope(ctx, "s", p4)}
    AND p.PaymentDate >= ? AND p.PaymentDate <= ?`;
  p4.push(fromStart, toEnd);

  const p5: any[] = [];
  const poSql = `SELECT COUNT(*) as cnt FROM purchaseorder po
    WHERE po.Deleted = 0 AND ${scope(ctx, "po", p5)}
    AND po.Date >= ? AND po.Date <= ?`;
  p5.push(fromStart, toEnd);

  const p6: any[] = [];
  const chartSql = `SELECT 
    DATE_FORMAT(s.Created, '%Y-%m') AS period,
    COALESCE(SUM(CASE WHEN s.SaleType = 0 THEN 1 ELSE 0 END),0) AS quotes,
    COALESCE(SUM(CASE WHEN s.SaleType = 1 THEN 1 ELSE 0 END),0) AS orders,
    COALESCE(SUM(CASE WHEN s.SaleType = 2 THEN 1 ELSE 0 END),0) AS invoices,
    COALESCE(SUM(CASE WHEN s.SaleType = 0 THEN s.SaleTotal ELSE 0 END),0) AS qVal,
    COALESCE(SUM(CASE WHEN s.SaleType = 1 THEN s.SaleTotal ELSE 0 END),0) AS oVal,
    COALESCE(SUM(CASE WHEN s.SaleType = 2 THEN s.SaleTotal ELSE 0 END),0) AS iVal
    FROM sale s WHERE s.Deleted = 0 AND ${scope(ctx, "s", p6)}
    AND s.Created >= ? AND s.Created <= ?
    GROUP BY DATE_FORMAT(s.Created, '%Y-%m') ORDER BY period`;
  p6.push(fromStart, toEnd);

  const p7: any[] = [];
  const compChartSql = `SELECT 
    DATE_FORMAT(j.SaleCuttingListCompletedDate, '%Y-%m') AS period,
    COUNT(*) AS completed,
    COALESCE(SUM(j.JobTotal),0) AS compVal
    FROM job j INNER JOIN sale s ON s.ID = j.SaleID AND s.Deleted = 0
    WHERE j.Deleted = 0 AND j.Completed = 1 AND ${scope(ctx, "s", p7)}
    AND j.SaleCuttingListCompletedDate >= ? AND j.SaleCuttingListCompletedDate <= ?
    GROUP BY DATE_FORMAT(j.SaleCuttingListCompletedDate, '%Y-%m')`;
  p7.push(fromStart, toEnd);

  const p8: any[] = [];
  const collChartSql = `SELECT 
    DATE_FORMAT(j.DateAdded, '%Y-%m') AS period,
    COUNT(*) AS collected,
    COALESCE(SUM(j.JobTotal),0) AS collVal
    FROM job j INNER JOIN sale s ON s.ID = j.SaleID AND s.Deleted = 0
    WHERE j.Deleted = 0 AND j.Collected = 1 AND ${scope(ctx, "s", p8)}
    AND j.DateAdded >= ? AND j.DateAdded <= ?
    GROUP BY DATE_FORMAT(j.DateAdded, '%Y-%m')`;
  p8.push(fromStart, toEnd);

  const [saleRows, compRows, collRows, payRows, poRows, chartRows, compChartRows, collChartRows] =
    await Promise.all([
      run(config, saleSql, p1),
      run(config, compSql, p2),
      run(config, collSql, p3),
      run(config, paySql, p4),
      run(config, poSql, p5),
      run(config, chartSql, p6),
      run(config, compChartSql, p7),
      run(config, collChartSql, p8),
    ]);

  const compMap: Record<string, { cnt: number; val: number }> = {};
  compChartRows.forEach((r) => {
    compMap[r.period] = { cnt: toInt(r.completed), val: toFloat(r.compVal) };
  });
  const collMap: Record<string, { cnt: number; val: number }> = {};
  collChartRows.forEach((r) => {
    collMap[r.period] = { cnt: toInt(r.collected), val: toFloat(r.collVal) };
  });

  const chartData = chartRows.map((r) => {
    const p = r.period || "";
    const [y, m] = String(p).split("-");
    const monthName = MONTHS[parseInt(m, 10) - 1] || p;
    return {
      period: `${monthName} ${y}`,
      quotes: toInt(r.quotes),
      orders: toInt(r.orders),
      invoices: toInt(r.invoices),
      completed: compMap[p]?.cnt ?? 0,
      collected: collMap[p]?.cnt ?? 0,
      qVal: toFloat(r.qVal),
      oVal: toFloat(r.oVal),
      iVal: toFloat(r.iVal),
      compVal: compMap[p]?.val ?? 0,
      collVal: collMap[p]?.val ?? 0,
    };
  });

  return {
    quotesCount: toInt(saleRows[0]?.quotes_count),
    quotesTotal: toFloat(saleRows[0]?.quotes_total),
    ordersCount: toInt(saleRows[0]?.orders_count),
    ordersTotal: toFloat(saleRows[0]?.orders_total),
    invoicesCount: toInt(saleRows[0]?.invoices_count),
    invoicesTotal: toFloat(saleRows[0]?.invoices_total),
    lineItemsCount: 0,
    lineItemsTotal: 0,
    completedCount: toInt(compRows[0]?.cnt),
    completedTotal: toFloat(compRows[0]?.total),
    collectedCount: toInt(collRows[0]?.cnt),
    collectedTotal: toFloat(collRows[0]?.total),
    totalPayments: toFloat(payRows[0]?.total_payments),
    totalSupplierOrders: toInt(poRows[0]?.cnt),
    chartData,
  };
}

export async function getCalendar(config: DataSourceConfig, ctx: FramerCtx, year: number, month: number) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 0 || month > 11) {
    throw new Error("Invalid calendar period");
  }
  const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const endDate = `${year}-${String(month + 1).padStart(2, "0")}-${new Date(year, month + 1, 0).getDate()} 23:59:59`;

  const params: any[] = [];
  const sql = `SELECT DATE(s.Due) as due_date, COUNT(DISTINCT j.ID) as job_count
    FROM job j INNER JOIN sale s ON s.ID = j.SaleID AND s.Deleted = 0
    WHERE j.Deleted = 0 AND j.Completed = 0 AND s.SaleType IN (1,2)
    AND ${scope(ctx, "s", params)}
    AND s.Due >= ? AND s.Due <= ?
    GROUP BY DATE(s.Due)`;
  params.push(startDate, endDate);

  const rows = await run(config, sql, params);
  const map: Record<string, number> = {};
  rows.forEach((r) => {
    const d = new Date(r.due_date);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    map[key] = toInt(r.job_count);
  });
  return map;
}
