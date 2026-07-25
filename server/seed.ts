import { storage } from "./storage";

export async function seedDatabase() {
  const existingDS = await storage.getDataSources();
  let dataSourceId = 1;
  
  // Always update first data source with current env vars
  if (existingDS.length > 0) {
    await storage.updateDataSource(existingDS[0].id, {
      name: "Frame Visualiser MySQL",
      config: {
        host: process.env.MYSQL_HOST || "127.0.0.1",
        user: process.env.MYSQL_USER || "root",
        password: process.env.MYSQL_PASSWORD || "",
        database: process.env.MYSQL_DATABASE || "test_db",
        port: Number(process.env.MYSQL_PORT) || 3306
      }
    });
    dataSourceId = existingDS[0].id;
    console.log("Data source updated with environment credentials");
  } else {
    // Create initial data source if none exist
    const newDs = await storage.createDataSource({
      name: "Frame Visualiser MySQL",
      type: "mysql",
      config: {
        host: process.env.MYSQL_HOST || "127.0.0.1",
        user: process.env.MYSQL_USER || "root",
        password: process.env.MYSQL_PASSWORD || "",
        database: process.env.MYSQL_DATABASE || "test_db",
        port: Number(process.env.MYSQL_PORT) || 3306
      }
    });
    dataSourceId = newDs.id;
    console.log("Database seeded successfully!");
  }

  // Define the Jobs Listing SQL - simplified for performance
  const jobsListingSql = `SELECT 
    CONCAT(f.SaleNumberPrefix, s.Number, '-', j.JobSalesNumber) AS Number,
    DATE_FORMAT(s.Due, '%d/%m/%Y') AS ValidUntil,
    j.Description,
    s.ContactName AS Customer,
    CASE WHEN j.Completed = 1 THEN 'Yes' ELSE '' END AS Complete,
    CASE WHEN j.Collected = 1 THEN 'Yes' ELSE '' END AS Collected,
    COALESCE(j.JobTotal, 0) AS Amount
FROM job j
INNER JOIN sale s ON j.SaleID = s.ID
INNER JOIN framer f ON s.FramerID = f.ID
WHERE j.Deleted = 0 
  AND s.Deleted = 0
  AND s.FramerID = '{{FRAMER_ID}}'
ORDER BY s.Created DESC
LIMIT 50`;

  // Seed or update Framer-specific queries
  const existingQueries = await storage.getSavedQueries();
  const existingJobsListing = existingQueries.find(q => q.name === "Jobs Listing");
  
  if (!existingJobsListing) {
    await storage.createSavedQuery({
      name: "Jobs Listing",
      description: "[framer] List of all jobs with customer, company, dates, and amounts. Use {{FRAMER_ID}} placeholder for auto-filtering.",
      dataSourceId,
      sql: jobsListingSql
    });
    console.log("Jobs Listing query seeded");
  } else {
    // Update existing query with latest SQL
    await storage.updateSavedQuery(existingJobsListing.id, {
      sql: jobsListingSql,
      dataSourceId
    });
    console.log("Jobs Listing query updated");
  }

  // Seed My Sales Summary query for framers
  const mySalesExists = existingQueries.some(q => q.name === "My Sales Summary");
  if (!mySalesExists) {
    await storage.createSavedQuery({
      name: "My Sales Summary",
      description: "[framer] Summary of your sales by type (Quote/Order/Invoice). Use {{FRAMER_ID}} placeholder for auto-filtering.",
      dataSourceId,
      sql: `SELECT 
    CASE s.SaleType 
      WHEN 0 THEN 'Quote'
      WHEN 1 THEN 'Order'
      WHEN 2 THEN 'Invoice'
      ELSE 'Unknown'
    END AS SaleType,
    COUNT(*) AS TotalCount,
    SUM(s.SaleTotal) AS TotalAmount
FROM sale s
WHERE s.Deleted = 0
  AND s.FramerID = '{{FRAMER_ID}}'
GROUP BY s.SaleType
ORDER BY s.SaleType`
    });
    console.log("My Sales Summary query seeded");
  }

  const cuttingListSql = `SELECT 
    i.Code AS Code,
    i.Name AS ItemName,
    i.StorageLocation AS Bin,
    CONCAT(f.SaleNumberPrefix, s.Number) AS SaleNumber,
    s.ContactName AS Customer,
    CASE s.SaleType 
      WHEN 0 THEN 'Quote'
      WHEN 1 THEN 'Order'
      WHEN 2 THEN 'Invoice'
      ELSE 'Other'
    END AS SaleType,
    sl.UsedQuantity AS Qty,
    CONCAT(ml.TotalWidth, 'mm x ', ml.TotalHeight, 'mm') AS InsideDimensions,
    CONCAT(
      ROUND(ml.TotalWidth + 2 * (COALESCE(m.Width, 0) - COALESCE(m.Rebate, 0))),
      'mm x ',
      ROUND(ml.TotalHeight + 2 * (COALESCE(m.Width, 0) - COALESCE(m.Rebate, 0))),
      'mm'
    ) AS OutsideDimensions,
    m.DefaultMouldingLength AS StockLengthMM,
    CASE WHEN sl.SaleCuttingListCompleted = 1 THEN 'Yes' ELSE '' END AS Complete
FROM saleline sl
INNER JOIN mouldingline ml ON ml.ID = sl.ID
INNER JOIN item i ON i.ID = sl.ItemID AND i.Deleted = 0
INNER JOIN sale s ON s.ID = sl.SaleID AND s.Deleted = 0 AND s.SaleType IN (1, 2)
INNER JOIN framer f ON s.FramerID = f.ID
LEFT JOIN moulding m ON m.ID = i.ID
WHERE sl.Deleted = 0 
  AND sl.SaleCuttingListCompleted = 0
  AND s.FramerID = '{{FRAMER_ID}}'
ORDER BY i.Code, s.Number
LIMIT 500`;

  const cuttingListExists = existingQueries.find(q => q.name === "Cutting List - Moulding");
  if (!cuttingListExists) {
    await storage.createSavedQuery({
      name: "Cutting List - Moulding",
      description: "[framer] Moulding cutting list showing incomplete Order+Invoice items with inside/outside dimensions. Use {{FRAMER_ID}} placeholder for auto-filtering.",
      dataSourceId,
      sql: cuttingListSql
    });
    console.log("Cutting List - Moulding query seeded");
  } else {
    await storage.updateSavedQuery(cuttingListExists.id, {
      sql: cuttingListSql,
      dataSourceId
    });
    console.log("Cutting List - Moulding query updated");
  }

  // ---------------------------------------------------------------------------
  // Admin customer-maintenance reports (framer = customer of the SaaS).
  // Subscription status is stored as text in framer.CurrentSubscriptionStored,
  // e.g. "Trial (Expires 30/05/2017)", "Premium (Expires 13/05/2018)",
  // "None, expired 01/06/2017". The embedded DD/MM/YYYY date is parsed out.
  // These are admin-only: no {{FRAMER_ID}} placeholder, so framers can't see them.
  // ---------------------------------------------------------------------------
  const SUB_DATE = "STR_TO_DATE(REGEXP_SUBSTR(f.CurrentSubscriptionStored, '[0-9]{2}/[0-9]{2}/[0-9]{4}'), '%d/%m/%Y')";

  const adminReports: { name: string; description: string; sql: string }[] = [
    {
      name: "Subscription Status Overview",
      description: "[admin] Count of framers by subscription status (Active, Trial, Expired, None). Good as a bar chart.",
      sql: `SELECT
    CASE
      WHEN f.CurrentSubscriptionStored IS NULL OR f.CurrentSubscriptionStored = '' THEN 'No subscription set'
      WHEN f.CurrentSubscriptionStored LIKE 'None, expired%' THEN 'Expired'
      WHEN f.CurrentSubscriptionStored LIKE 'Trial%' THEN 'Trial'
      WHEN f.CurrentSubscriptionStored LIKE 'None%' THEN 'None / cancelled'
      ELSE 'Active (paid)'
    END AS SubscriptionStatus,
    COUNT(*) AS Framers
FROM framer f
WHERE f.Deleted = 0
GROUP BY SubscriptionStatus
ORDER BY Framers DESC`
    },
    {
      name: "Trial Framers - Follow Up",
      description: "[admin] Framers currently on a trial, with trial expiry date and days remaining. Follow up before they lapse.",
      sql: `SELECT
    f.Name AS Framer,
    f.CurrentSubscriptionStored AS Subscription,
    ${SUB_DATE} AS TrialExpiry,
    DATEDIFF(${SUB_DATE}, CURDATE()) AS DaysUntilExpiry,
    DATE_FORMAT(f.DateRegistered, '%d/%m/%Y') AS Registered,
    DATE_FORMAT(f.LastAccessed, '%d/%m/%Y') AS LastLogin
FROM framer f
WHERE f.Deleted = 0
  AND f.CurrentSubscriptionStored LIKE 'Trial%'
ORDER BY TrialExpiry ASC`
    },
    {
      name: "Trials Not Activated",
      description: "[admin] Trial framers who have created zero sales. Best onboarding-call candidates - they haven't felt the value yet.",
      sql: `SELECT
    f.Name AS Framer,
    ${SUB_DATE} AS TrialExpiry,
    DATE_FORMAT(f.DateRegistered, '%d/%m/%Y') AS Registered,
    DATE_FORMAT(f.LastAccessed, '%d/%m/%Y') AS LastLogin,
    COALESCE(s.cnt, 0) AS SalesCreated
FROM framer f
LEFT JOIN (
    SELECT FramerID, COUNT(*) AS cnt FROM sale WHERE Deleted = 0 GROUP BY FramerID
) s ON s.FramerID = f.ID
WHERE f.Deleted = 0
  AND f.CurrentSubscriptionStored LIKE 'Trial%'
  AND COALESCE(s.cnt, 0) = 0
ORDER BY f.DateRegistered DESC`
    },
    {
      name: "Recently Expired Framers",
      description: "[admin] Framers whose subscription has expired, most recent first. Win-back call list.",
      sql: `SELECT
    f.Name AS Framer,
    f.CurrentSubscriptionStored AS Subscription,
    ${SUB_DATE} AS ExpiredOn,
    DATEDIFF(CURDATE(), ${SUB_DATE}) AS DaysSinceExpiry,
    DATE_FORMAT(f.LastAccessed, '%d/%m/%Y') AS LastLogin,
    DATE_FORMAT(f.DateRegistered, '%d/%m/%Y') AS Registered
FROM framer f
WHERE f.Deleted = 0
  AND f.CurrentSubscriptionStored LIKE 'None, expired%'
ORDER BY ExpiredOn DESC
LIMIT 200`
    },
    {
      name: "Subscriptions Expiring Soon",
      description: "[admin] Active paid framers whose subscription expires within the next 30 days. Renewal reminder list.",
      sql: `SELECT
    f.Name AS Framer,
    f.CurrentSubscriptionStored AS Subscription,
    ${SUB_DATE} AS Expiry,
    DATEDIFF(${SUB_DATE}, CURDATE()) AS DaysUntilExpiry,
    DATE_FORMAT(f.LastAccessed, '%d/%m/%Y') AS LastLogin
FROM framer f
WHERE f.Deleted = 0
  AND f.CurrentSubscriptionStored IS NOT NULL
  AND f.CurrentSubscriptionStored <> ''
  AND f.CurrentSubscriptionStored NOT LIKE 'None%'
  AND f.CurrentSubscriptionStored NOT LIKE 'Trial%'
  AND ${SUB_DATE} BETWEEN CURDATE() AND CURDATE() + INTERVAL 30 DAY
ORDER BY Expiry ASC`
    },
    {
      name: "Framer Activity Leaderboard (90 days)",
      description: "[admin] Top framers by order/invoice value over the last 90 days. At-a-glance view of who is healthy and active.",
      sql: `SELECT
    f.Name AS Framer,
    COUNT(CASE WHEN s.SaleType = 0 THEN 1 END) AS Quotes,
    COUNT(CASE WHEN s.SaleType = 1 THEN 1 END) AS Orders,
    COUNT(CASE WHEN s.SaleType = 2 THEN 1 END) AS Invoices,
    ROUND(SUM(CASE WHEN s.SaleType IN (1, 2) THEN s.SaleTotal ELSE 0 END), 2) AS OrderInvoiceValue,
    DATE_FORMAT(f.LastAccessed, '%d/%m/%Y') AS LastLogin
FROM framer f
INNER JOIN sale s ON s.FramerID = f.ID AND s.Deleted = 0 AND s.Created >= CURDATE() - INTERVAL 90 DAY
WHERE f.Deleted = 0
GROUP BY f.ID, f.Name, f.LastAccessed
ORDER BY OrderInvoiceValue DESC
LIMIT 50`
    },
    {
      name: "Top Framers by Value (90 days)",
      description: "[admin] Top 15 framers by order + invoice value over the last 90 days. Two columns so it renders as a clean bar chart.",
      sql: `SELECT
    f.Name AS Framer,
    ROUND(SUM(CASE WHEN s.SaleType IN (1, 2) THEN s.SaleTotal ELSE 0 END), 2) AS OrderInvoiceValue
FROM framer f
INNER JOIN sale s ON s.FramerID = f.ID AND s.Deleted = 0 AND s.Created >= CURDATE() - INTERVAL 90 DAY
WHERE f.Deleted = 0
GROUP BY f.ID, f.Name
HAVING OrderInvoiceValue > 0
ORDER BY OrderInvoiceValue DESC
LIMIT 15`
    },
    {
      name: "New Framer Signups (90 days)",
      description: "[admin] Framers registered in the last 90 days with their activity so far. Track onboarding and early adoption.",
      sql: `SELECT
    f.Name AS Framer,
    f.CurrentSubscriptionStored AS Subscription,
    DATE_FORMAT(f.DateRegistered, '%d/%m/%Y') AS Registered,
    DATEDIFF(CURDATE(), f.DateRegistered) AS DaysSinceSignup,
    DATE_FORMAT(f.LastAccessed, '%d/%m/%Y') AS LastLogin,
    COALESCE(s.cnt, 0) AS SalesCreated
FROM framer f
LEFT JOIN (
    SELECT FramerID, COUNT(*) AS cnt FROM sale WHERE Deleted = 0 GROUP BY FramerID
) s ON s.FramerID = f.ID
WHERE f.Deleted = 0
  AND f.DateRegistered >= CURDATE() - INTERVAL 90 DAY
ORDER BY f.DateRegistered DESC`
    }
  ];

  for (const report of adminReports) {
    const existing = existingQueries.find(q => q.name === report.name);
    if (!existing) {
      await storage.createSavedQuery({
        name: report.name,
        description: report.description,
        dataSourceId,
        sql: report.sql
      });
      console.log(`Admin report seeded: ${report.name}`);
    } else {
      await storage.updateSavedQuery(existing.id, {
        sql: report.sql,
        dataSourceId
      });
      console.log(`Admin report updated: ${report.name}`);
    }
  }

  // ---------------------------------------------------------------------------
  // Group the admin reports into viewable dashboards (with charts where useful).
  // Idempotent: dashboards matched by name, widgets matched by title.
  // ---------------------------------------------------------------------------
  const allQueries = await storage.getSavedQueries();
  const queryIdByName = new Map(allQueries.map(q => [q.name, q.id]));

  type Widget = { title: string; queryName: string; type: "table" | "bar" | "line" };
  const adminDashboards: { name: string; description: string; widgets: Widget[] }[] = [
    {
      name: "Customer Maintenance - Subscriptions",
      description: "[admin] Subscription health: trial follow-ups, renewals coming due, and win-back lists.",
      widgets: [
        { title: "Subscription Status Overview", queryName: "Subscription Status Overview", type: "bar" },
        { title: "Trial Framers - Follow Up", queryName: "Trial Framers - Follow Up", type: "table" },
        { title: "Trials Not Activated", queryName: "Trials Not Activated", type: "table" },
        { title: "Subscriptions Expiring Soon", queryName: "Subscriptions Expiring Soon", type: "table" },
        { title: "Recently Expired Framers", queryName: "Recently Expired Framers", type: "table" }
      ]
    },
    {
      name: "Customer Maintenance - Engagement",
      description: "[admin] Who is active and growing: top earners, activity leaderboard, and new signups.",
      widgets: [
        { title: "Top Framers by Value (90 days)", queryName: "Top Framers by Value (90 days)", type: "bar" },
        { title: "Framer Activity Leaderboard (90 days)", queryName: "Framer Activity Leaderboard (90 days)", type: "table" },
        { title: "New Framer Signups (90 days)", queryName: "New Framer Signups (90 days)", type: "table" }
      ]
    }
  ];

  const existingDashboards = await storage.getDashboards();
  for (const dash of adminDashboards) {
    let dashboard = existingDashboards.find(d => d.name === dash.name);
    if (!dashboard) {
      dashboard = await storage.createDashboard({ name: dash.name, description: dash.description });
      console.log(`Admin dashboard seeded: ${dash.name}`);
    }

    const existingWidgets = await storage.getReports(dashboard.id);
    let y = 0;
    for (const widget of dash.widgets) {
      const queryId = queryIdByName.get(widget.queryName);
      const height = widget.type === "table" ? 8 : 6;
      if (queryId && !existingWidgets.some(w => w.title === widget.title)) {
        await storage.createReport({
          dashboardId: dashboard.id,
          queryId,
          type: widget.type,
          title: widget.title,
          config: {},
          layout: { x: 0, y, w: 12, h: height }
        });
        console.log(`  Widget added to ${dash.name}: ${widget.title}`);
      }
      y += height;
    }
  }
}
