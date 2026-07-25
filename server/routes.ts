import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupCustomAuth, registerCustomAuthRoutes, isAuthenticated, getFramerContext } from "./customAuth";
import { executeMySQL, executeMySQLWithParams, testMySQLConnection, friendlyMysqlError } from "./mysql";
import { getLiveSchemaText } from "./schema";
import * as framerDashboard from "./framerDashboard";
import { runCuttingList } from "./cuttingListReport";
import { runJobList } from "./jobListReport";
import { seedDatabase } from "./seed";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Seed Database (async, don't await blocking startup excessively, but for MVP it's fine)
  await seedDatabase();

  // Setup Custom Auth (Framer ID based)
  await setupCustomAuth(app);
  registerCustomAuthRoutes(app);

  // Require Auth for all API routes (except login/callback which are handled by setupAuth)
  // app.use('/api/*', isAuthenticated); // Wait, this might block /api/login?
  // No, setupAuth mounts /api/login before this if we put it here?
  // Express middleware order matters.
  // Actually, let's apply it specifically to our routes or use the middleware in the handlers.
  // For simplicity, I'll apply it to the specific routes I define below.
  const protectedApi = [
    '/api/ai',
    '/api/data-sources', '/api/queries', '/api/dashboards', '/api/reports', '/api/mysql',
    '/api/framer-dashboard',
    '/api/cutting-list'
  ];
  
  // Middleware for protected routes
  app.use((req, res, next) => {
    const path = req.path;
    if (protectedApi.some(prefix => path.startsWith(prefix))) {
       return isAuthenticated(req, res, next);
    }
    next();
  });

  // Authorization helpers
  // Admin-only guard: returns false (and sends 403) when the caller is not an admin.
  const requireAdmin = (req: any, res: any): boolean => {
    const ctx = getFramerContext(req);
    if (!ctx.isAdmin) {
      res.status(403).json({
        message: "Administrator access required. This action is restricted to administrators.",
      });
      return false;
    }
    return true;
  };

  // Reject any non read-only SQL (framers may only SELECT).
  const isReadOnlySql = (sql: string): boolean => {
    const stripped = sql
      .replace(/--.*$/gm, "")        // line comments
      .replace(/\/\*[\s\S]*?\*\//g, "") // block comments
      .trim()
      .toLowerCase();
    if (!stripped) return false;
    // Must begin with SELECT or WITH (CTE)
    if (!/^(select|with)\b/.test(stripped)) return false;
    // Block dangerous keywords anywhere
    const forbidden = /\b(insert|update|delete|drop|alter|truncate|create|grant|revoke|rename|merge|call|execute|exec)\b/;
    if (forbidden.test(stripped)) return false;
    if (/\binto\s+(outfile|dumpfile)\b/.test(stripped)) return false;
    return true;
  };

  // Remove SQL comments so a placeholder hidden in a comment can never satisfy
  // the scoping check, and so commented-out clauses can't smuggle SQL.
  const stripSqlComments = (sql: string): string =>
    sql
      .replace(/--.*$/gm, "")
      .replace(/\/\*[\s\S]*?\*\//g, "");

  // A saved query is considered framer-scoped only if its EXECUTABLE SQL (after
  // stripping comments) contains a real equality predicate binding FramerID to
  // the placeholder, e.g. `s.FramerID = '{{FRAMER_ID}}'`. A bare placeholder, or
  // one buried in a comment, does NOT qualify — that is the bypass class we are
  // closing. Returns the comment-stripped SQL if scoped, otherwise null.
  const SCOPED_PREDICATE = /\w*\.?FramerID\s*=\s*'\{\{FRAMER_ID\}\}'/i;
  const getFramerScopedSql = (sql: string): string | null => {
    const executable = stripSqlComments(sql);
    return SCOPED_PREDICATE.test(executable) ? executable : null;
  };


  // === MySQL Execution ===
  app.post(api.mysql.execute.path, async (req, res) => {
    try {
      // Raw SQL execution is admin-only. Framers must never submit SQL: tenant
      // scoping cannot be safely enforced on arbitrary user-supplied SQL (a
      // placeholder can be hidden in comments/tautologies to bypass it). Framers
      // instead use server-built, parameterized endpoints (framer dashboard,
      // report builders) and run-by-id for admin-prepared saved queries.
      if (!requireAdmin(req, res)) return;

      const { dataSourceId, sql } = api.mysql.execute.input.parse(req.body);
      const dataSource = await storage.getDataSource(dataSourceId);

      if (!dataSource) {
        return res.status(404).json({ message: "Data source not found" });
      }

      // Execute
      const start = Date.now();
      const result = await executeMySQL(dataSource.config, sql);
      const executionTimeMs = Date.now() - start;

      res.json({
        ...result,
        executionTimeMs,
        framerContext: getFramerContext(req),
      });
    } catch (err: any) {
      console.error("MySQL Execution Error:", err);
      res.status(500).json({ message: friendlyMysqlError(err) });
    }
  });
  
  // === Get Framer Context ===
  app.get("/api/auth/framer-context", (req, res) => {
    const framerContext = getFramerContext(req);
    res.json(framerContext);
  });

  app.post(api.mysql.testConnection.path, async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const config = api.mysql.testConnection.input.parse(req.body);
      await testMySQLConnection(config.config);
      res.json({ success: true, message: "Connection successful" });
    } catch (err: any) {
      res.status(400).json({ message: friendlyMysqlError(err) });
    }
  });


  // === Data Sources ===
  // Reading data sources exposes DB connection credentials, so it is admin-only.
  app.get(api.dataSources.list.path, async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const ds = await storage.getDataSources();
    res.json(ds);
  });
  app.post(api.dataSources.create.path, async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const ds = await storage.createDataSource(req.body);
    res.status(201).json(ds);
  });
  app.put(api.dataSources.update.path, async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const ds = await storage.updateDataSource(Number(req.params.id), req.body);
    res.json(ds);
  });
  app.delete(api.dataSources.delete.path, async (req, res) => {
    if (!requireAdmin(req, res)) return;
    await storage.deleteDataSource(Number(req.params.id));
    res.status(204).send();
  });


  // === Saved Queries ===
  app.get(api.queries.list.path, async (req, res) => {
    const ctx = getFramerContext(req);
    let queries = await storage.getSavedQueries();
    // Framers may only see admin-prepared queries that are genuinely scoped to
    // their portal (a real `FramerID = '{{FRAMER_ID}}'` predicate, not a bare or
    // commented placeholder), matching what they are actually allowed to run.
    if (!ctx.isAdmin) {
      queries = queries.filter((q) => getFramerScopedSql(q.sql) !== null);
    }
    res.json(queries);
  });
  app.post(api.queries.create.path, async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const query = await storage.createSavedQuery(req.body);
    res.status(201).json(query);
  });
  app.get(api.queries.get.path, async (req, res) => {
    const ctx = getFramerContext(req);
    const query = await storage.getSavedQuery(Number(req.params.id));
    if (!query) return res.status(404).json({ message: "Query not found" });
    // Hide admin-only (unscoped) queries from framers, using the same structural
    // scoping check that governs execution.
    if (!ctx.isAdmin && getFramerScopedSql(query.sql) === null) {
      return res.status(404).json({ message: "Query not found" });
    }
    res.json(query);
  });
  // Run a saved query by id. Framers may only run portal-scoped queries; the
  // server injects their own FramerID so they cannot read another framer's data.
  app.post(api.queries.run.path, async (req, res) => {
    try {
      const ctx = getFramerContext(req);
      const query = await storage.getSavedQuery(Number(req.params.id));
      if (!query) return res.status(404).json({ message: "Query not found" });

      let sql = query.sql;

      // Optional date-range override for dashboard widgets. Dates are validated
      // (YYYY-MM-DD) before being substituted into recognised CURDATE/DATE_SUB
      // patterns, mirroring the previous client-side behaviour.
      const body = api.queries.run.input?.parse(req.body) ?? {};
      const isDate = (d?: string) => !!d && /^\d{4}-\d{2}-\d{2}$/.test(d);
      if (isDate(body.startDate) && isDate(body.endDate)) {
        const start = body.startDate as string;
        const end = body.endDate as string;
        sql = sql.replace(
          />= DATE_SUB\(CURDATE\(\), INTERVAL \d+ (YEAR|MONTH|WEEK|DAY)\)/gi,
          `>= '${start}'`
        );
        if (!sql.toLowerCase().includes('<= ')) {
          sql = sql.replace(
            /WHERE (.*?)(>= '\d{4}-\d{2}-\d{2}')/gi,
            `WHERE $1$2 AND $1<= '${end}'`
          );
        }
      }

      if (ctx.isAdmin) {
        sql = sql.replace(/\w*\.?FramerID\s*=\s*'\{\{FRAMER_ID\}\}'/gi, '1=1');
        sql = sql.replace(/\{\{FRAMER_ID\}\}/g, ctx.framerId || '');
      } else {
        if (!ctx.framerId) {
          return res.status(403).json({ message: "Access denied: no Framer ID is associated with your account." });
        }
        // Structural scoping check: the EXECUTABLE SQL must contain a real
        // `FramerID = '{{FRAMER_ID}}'` predicate. A placeholder hidden in a
        // comment (the bypass class) or absent entirely is rejected.
        const scopedSql = getFramerScopedSql(sql);
        if (!scopedSql) {
          return res.status(403).json({ message: "Access denied: this report is not available for your account." });
        }
        sql = scopedSql;
        if (!isReadOnlySql(sql)) {
          return res.status(403).json({ message: "Access denied: only read-only reports are permitted." });
        }
        // Bind the caller's own FramerID into the placeholder(s). The table alias
        // (e.g. `s.FramerID`) is preserved because only the quoted placeholder
        // value is substituted.
        sql = sql.replace(/\{\{FRAMER_ID\}\}/g, ctx.framerId);
      }

      const dataSource = await storage.getDataSource(query.dataSourceId);
      if (!dataSource) return res.status(404).json({ message: "Data source not found" });

      const start = Date.now();
      const result = await executeMySQL(dataSource.config, sql);
      res.json({ ...result, executionTimeMs: Date.now() - start });
    } catch (err: any) {
      console.error("Saved Query Run Error:", err);
      res.status(500).json({ message: friendlyMysqlError(err) });
    }
  });
  // === Framer Dashboard (server-computed, tenant-scoped) ===
  // SQL is built and scoped on the server using the authenticated FramerID so a
  // framer can never read another framer's data, even by tampering with requests.
  const getFramerDataSource = async () => {
    const ds = await storage.getDataSource(1);
    if (ds) return ds;
    const all = await storage.getDataSources();
    return all[0];
  };

  app.post(api.reportBuilders.cuttingList.path, async (req, res) => {
    try {
      const ctx = getFramerContext(req);
      if (!ctx.isAdmin && !ctx.framerId) {
        return res.status(403).json({ message: "Access denied" });
      }
      const filters = api.reportBuilders.cuttingList.input.parse(req.body);
      const ds = await getFramerDataSource();
      if (!ds) return res.status(500).json({ message: "No data source configured" });
      res.json(await runCuttingList(ds.config, ctx, filters));
    } catch (err: any) {
      console.error("Cutting list report error:", err);
      res.status(500).json({ message: friendlyMysqlError(err) });
    }
  });

  app.post(api.reportBuilders.jobList.path, async (req, res) => {
    try {
      const ctx = getFramerContext(req);
      if (!ctx.isAdmin && !ctx.framerId) {
        return res.status(403).json({ message: "Access denied" });
      }
      const filters = api.reportBuilders.jobList.input.parse(req.body);
      const ds = await getFramerDataSource();
      if (!ds) return res.status(500).json({ message: "No data source configured" });
      res.json(await runJobList(ds.config, ctx, filters));
    } catch (err: any) {
      console.error("Job list report error:", err);
      res.status(500).json({ message: friendlyMysqlError(err) });
    }
  });

  app.post(api.framerDashboard.overview.path, async (req, res) => {
    try {
      const ctx = getFramerContext(req);
      if (!ctx.isAdmin && !ctx.framerId) {
        return res.status(403).json({ message: "Access denied" });
      }
      const ds = await getFramerDataSource();
      if (!ds) return res.status(500).json({ message: "No data source configured" });
      res.json(await framerDashboard.getOverview(ds.config, ctx));
    } catch (err: any) {
      console.error("Framer overview error:", err);
      res.status(500).json({ message: friendlyMysqlError(err) });
    }
  });

  app.post(api.framerDashboard.today.path, async (req, res) => {
    try {
      const ctx = getFramerContext(req);
      if (!ctx.isAdmin && !ctx.framerId) {
        return res.status(403).json({ message: "Access denied" });
      }
      const ds = await getFramerDataSource();
      if (!ds) return res.status(500).json({ message: "No data source configured" });
      res.json(await framerDashboard.getToday(ds.config, ctx));
    } catch (err: any) {
      console.error("Framer today error:", err);
      res.status(500).json({ message: friendlyMysqlError(err) });
    }
  });

  app.post(api.framerDashboard.period.path, async (req, res) => {
    try {
      const ctx = getFramerContext(req);
      if (!ctx.isAdmin && !ctx.framerId) {
        return res.status(403).json({ message: "Access denied" });
      }
      const { from, to } = api.framerDashboard.period.input.parse(req.body);
      const ds = await getFramerDataSource();
      if (!ds) return res.status(500).json({ message: "No data source configured" });
      res.json(await framerDashboard.getPeriod(ds.config, ctx, from, to));
    } catch (err: any) {
      console.error("Framer period error:", err);
      res.status(500).json({ message: friendlyMysqlError(err) });
    }
  });

  app.post(api.framerDashboard.calendar.path, async (req, res) => {
    try {
      const ctx = getFramerContext(req);
      if (!ctx.isAdmin && !ctx.framerId) {
        return res.status(403).json({ message: "Access denied" });
      }
      const { year, month } = api.framerDashboard.calendar.input.parse(req.body);
      const ds = await getFramerDataSource();
      if (!ds) return res.status(500).json({ message: "No data source configured" });
      res.json(await framerDashboard.getCalendar(ds.config, ctx, year, month));
    } catch (err: any) {
      console.error("Framer calendar error:", err);
      res.status(500).json({ message: friendlyMysqlError(err) });
    }
  });

  app.put(api.queries.update.path, async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const query = await storage.updateSavedQuery(Number(req.params.id), req.body);
    res.json(query);
  });
  app.delete(api.queries.delete.path, async (req, res) => {
    if (!requireAdmin(req, res)) return;
    await storage.deleteSavedQuery(Number(req.params.id));
    res.status(204).send();
  });


  // === Dashboards ===
  // Framers may only see framer-scoped dashboards (description prefixed "[framer]").
  // Everything else (admin dashboards, no-prefix dashboards) is admin-only, so we
  // don't leak admin dashboard names/descriptions or widget metadata to framers.
  const isFramerDashboard = (d?: { description?: string | null }): boolean =>
    !!d?.description?.startsWith("[framer]");

  app.get(api.dashboards.list.path, async (req, res) => {
    const ds = await storage.getDashboards();
    const ctx = getFramerContext(req);
    res.json(ctx.isAdmin ? ds : ds.filter(isFramerDashboard));
  });
  app.post(api.dashboards.create.path, async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const d = await storage.createDashboard(req.body);
    res.status(201).json(d);
  });
  app.get(api.dashboards.get.path, async (req, res) => {
    const d = await storage.getDashboard(Number(req.params.id));
    if (!d) return res.status(404).json({ message: "Dashboard not found" });
    const ctx = getFramerContext(req);
    if (!ctx.isAdmin && !isFramerDashboard(d)) {
      return res.status(404).json({ message: "Dashboard not found" });
    }
    res.json(d);
  });
  app.get(api.dashboards.getReports.path, async (req, res) => {
    const ctx = getFramerContext(req);
    if (!ctx.isAdmin) {
      const d = await storage.getDashboard(Number(req.params.id));
      if (!isFramerDashboard(d)) {
        return res.status(404).json({ message: "Dashboard not found" });
      }
    }
    const reports = await storage.getReports(Number(req.params.id));
    res.json(reports);
  });
  app.put(api.dashboards.update.path, async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const d = await storage.updateDashboard(Number(req.params.id), req.body);
    res.json(d);
  });
  app.delete(api.dashboards.delete.path, async (req, res) => {
    if (!requireAdmin(req, res)) return;
    await storage.deleteDashboard(Number(req.params.id));
    res.status(204).send();
  });

  // === Reports ===
  app.post(api.reports.create.path, async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const r = await storage.createReport(req.body);
    res.status(201).json(r);
  });
  app.put(api.reports.update.path, async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const r = await storage.updateReport(Number(req.params.id), req.body);
    res.json(r);
  });
  app.delete(api.reports.delete.path, async (req, res) => {
    if (!requireAdmin(req, res)) return;
    await storage.deleteReport(Number(req.params.id));
    res.status(204).send();
  });

  // === Cutting List Data ===
  app.get('/api/cutting-list', async (req, res) => {
    try {
      const dataSources = await storage.getDataSources();
      const dataSource = dataSources[0];
      if (!dataSource) {
        return res.status(400).json({ message: "No data source configured" });
      }

      const framerContext = getFramerContext(req);
      const isAdmin = framerContext.isAdmin;
      const framerId = framerContext.framerId || '';

      const dateFrom = req.query.from as string | undefined;
      const dateTo = req.query.to as string | undefined;

      const framerClause = isAdmin ? '1=1' : 's.FramerID = ?';
      let dateClause = '';
      const baseParams: any[] = isAdmin ? [] : [framerId];
      const perUnionParams: any[] = [];

      if (dateFrom) {
        dateClause += ' AND s.Created >= ?';
        perUnionParams.push(dateFrom + ' 00:00:00');
      }
      if (dateTo) {
        dateClause += ' AND s.Created <= ?';
        perUnionParams.push(dateTo + ' 23:59:59');
      }

      const unionParams = [...baseParams, ...perUnionParams];
      const params = [...unionParams, ...unionParams, ...unionParams, ...unionParams];

      const sql = `
        SELECT 
          s.Number AS SaleNumber,
          s.ContactName,
          i.Code AS ItemCode,
          i.Name AS ItemName,
          sl.UsedQuantity,
          'Moulding' AS ItemType,
          ml.TotalWidth AS CutWidth,
          ml.TotalHeight AS CutHeight,
          ml.Chops,
          m.DefaultMouldingLength AS StockLength,
          NULL AS StockSheetWidth,
          NULL AS StockSheetHeight,
          NULL AS SheetSizeUnit,
          m.Width AS MouldingWidth,
          m.Rebate AS MouldingRebate
        FROM saleline sl
        INNER JOIN mouldingline ml ON ml.ID = sl.ID
        INNER JOIN item i ON i.ID = sl.ItemID AND i.Deleted = 0
        INNER JOIN sale s ON s.ID = sl.SaleID AND s.Deleted = 0 AND s.SaleType = 1
        LEFT JOIN moulding m ON m.ID = i.ID
        WHERE sl.Deleted = 0 AND sl.SaleCuttingListCompleted = 0
          AND ${framerClause}${dateClause}

        UNION ALL

        SELECT 
          s.Number AS SaleNumber,
          s.ContactName,
          i.Code AS ItemCode,
          i.Name AS ItemName,
          sl.UsedQuantity,
          'Matboard' AS ItemType,
          mbl.TotalWidth AS CutWidth,
          mbl.TotalHeight AS CutHeight,
          mbl.Chops,
          NULL AS StockLength,
          mb.SheetWidth AS StockSheetWidth,
          mb.SheetHeight AS StockSheetHeight,
          mb.SheetSizeUnit AS SheetSizeUnit,
          NULL AS MouldingWidth,
          NULL AS MouldingRebate
        FROM saleline sl
        INNER JOIN matboardline mbl ON mbl.ID = sl.ID
        INNER JOIN item i ON i.ID = sl.ItemID AND i.Deleted = 0
        INNER JOIN sale s ON s.ID = sl.SaleID AND s.Deleted = 0 AND s.SaleType = 1
        LEFT JOIN matboard mb ON mb.ID = i.ID
        WHERE sl.Deleted = 0 AND sl.SaleCuttingListCompleted = 0
          AND ${framerClause}${dateClause}

        UNION ALL

        SELECT 
          s.Number AS SaleNumber,
          s.ContactName,
          i.Code AS ItemCode,
          i.Name AS ItemName,
          sl.UsedQuantity,
          'Backing' AS ItemType,
          bl.TotalWidth AS CutWidth,
          bl.TotalHeight AS CutHeight,
          bl.Chops,
          NULL AS StockLength,
          bk.SheetWidth AS StockSheetWidth,
          bk.SheetHeight AS StockSheetHeight,
          bk.SheetSizeUnit AS SheetSizeUnit,
          NULL AS MouldingWidth,
          NULL AS MouldingRebate
        FROM saleline sl
        INNER JOIN backingline bl ON bl.ID = sl.ID
        INNER JOIN item i ON i.ID = sl.ItemID AND i.Deleted = 0
        INNER JOIN sale s ON s.ID = sl.SaleID AND s.Deleted = 0 AND s.SaleType = 1
        LEFT JOIN backing bk ON bk.ID = i.ID
        WHERE sl.Deleted = 0 AND sl.SaleCuttingListCompleted = 0
          AND ${framerClause}${dateClause}

        UNION ALL

        SELECT 
          s.Number AS SaleNumber,
          s.ContactName,
          i.Code AS ItemCode,
          i.Name AS ItemName,
          sl.UsedQuantity,
          'Covering' AS ItemType,
          cl.TotalWidth AS CutWidth,
          cl.TotalHeight AS CutHeight,
          cl.Chops,
          NULL AS StockLength,
          cv.SheetWidth AS StockSheetWidth,
          cv.SheetHeight AS StockSheetHeight,
          cv.SheetSizeUnit AS SheetSizeUnit,
          NULL AS MouldingWidth,
          NULL AS MouldingRebate
        FROM saleline sl
        INNER JOIN coveringline cl ON cl.ID = sl.ID
        INNER JOIN item i ON i.ID = sl.ItemID AND i.Deleted = 0
        INNER JOIN sale s ON s.ID = sl.SaleID AND s.Deleted = 0 AND s.SaleType = 1
        LEFT JOIN covering cv ON cv.ID = i.ID
        WHERE sl.Deleted = 0 AND sl.SaleCuttingListCompleted = 0
          AND ${framerClause}${dateClause}

        ORDER BY SaleNumber DESC
        LIMIT 500
      `;

      const result = params.length > 0
        ? await executeMySQLWithParams(dataSource.config, sql, params)
        : await executeMySQL(dataSource.config, sql);
      res.json({
        columns: result.columns,
        rows: result.rows,
        totalRows: result.rows.length
      });
    } catch (err: any) {
      console.error("Cutting List Error:", err);
      res.status(500).json({ message: friendlyMysqlError(err) });
    }
  });

  // === AI Database Assistant ===
  const aiAskSchema = z.object({
    question: z.string().min(1).max(2000),
    conversationHistory: z.array(z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string()
    })).optional().default([])
  });

  app.post('/api/ai/ask', async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const parsed = aiAskSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request", errors: parsed.error.errors });
      }
      const { question, conversationHistory } = parsed.data;

      // Get data source for MySQL queries
      const dataSources = await storage.getDataSources();
      const dataSource = dataSources[0]; // Use first data source
      const framerContext = getFramerContext(req);
      
      if (!dataSource) {
        return res.status(400).json({ message: "No data source configured" });
      }

      // Build framer access context for AI
      const framerAccessContext = framerContext.isAdmin 
        ? `ACCESS LEVEL: Administration - You can query ALL framers and ALL data.`
        : `ACCESS LEVEL: Framer-specific - You are querying for Framer ID: '${framerContext.framerId}'
CRITICAL: ALL queries involving framer-specific data MUST include a filter for this FramerID.
- For sale table: WHERE sale.FramerID = '${framerContext.framerId}'
- For customer table: WHERE customer.FramerID = '${framerContext.framerId}'
- For any table linked to sale (job, saleline): Join through sale and filter by sale.FramerID
- You must NEVER show data from other framers.`;

      // Fetch the LIVE database schema so the AI always has accurate, complete
      // knowledge of every table and column (no hand-maintained list to go stale).
      let liveSchema = "";
      try {
        liveSchema = await getLiveSchemaText(dataSource.config);
      } catch (schemaErr: any) {
        console.error("Schema introspection failed:", schemaErr);
      }

      // Database schema context for the AI
      const schemaContext = `
You are a helpful database assistant for the i-FRAMER application. You can query the MySQL (MariaDB) database to answer questions.

${framerAccessContext}

=== LIVE DATABASE SCHEMA ===
The following is the COMPLETE, CURRENT schema introspected directly from the database.
Each line is "TABLE <name>: <column> (<type>), ...". ALWAYS use these exact table and
column names. Never invent column names. If a column you expect is not listed, it does
not exist — look for the correct name in the schema below.

${liveSchema || "(Schema unavailable - rely on business notes below and ask the user to verify column names.)"}

=== KEY RELATIONSHIPS & BUSINESS RULES (not obvious from schema alone) ===
- The 'framer' table represents the businesses/customers using the software. Use framer.Name for the business name; framer.Slug is its URL handle.
- framer.OwnerID links to user.ID.
- Plans: Basic $39, Medium $59, Premium $99, Trial $0 (see the plan table).
- Soft deletes: most tables use a Deleted flag (0 = active). ALWAYS add "WHERE Deleted = 0" when the table has a Deleted column. Note: the customer table does NOT have a Deleted column.
- Items: 'item' is the base table. Item subtypes share the SAME ID: moulding.ID = item.ID, matboard.ID = item.ID, backing.ID = item.ID, covering.ID = item.ID, miscellaneous.ID = item.ID. To find mouldings: JOIN item i ON i.ID = moulding.ID.
- saleline links sales/jobs to items via saleline.ItemID.
- Customer name resolution: sale.CustomerID -> customer.ID = profile.ID -> profile.PersonID -> person.FullName. Company name: person.OrganisationID -> organisation.TradingName.
- COUNTRY GOTCHA: framer.CountryCode holds a 2-letter ISO code (e.g. 'AU','GB','NZ'). The 'country' table is keyed by a GUID 'ID' and has NO 2-letter code column, so you CANNOT join framer to country on the code. If you need a readable country name from a framer's CountryCode, map the ISO code to a name with a CASE expression instead of joining.
- SMS sender for a framer is framer.SendSmsFrom (with framer.UseDefaultSmsFrom indicating whether to fall back to country/trader defaults).

When asked a question:
1. Generate a SQL query to answer it, using ONLY real table/column names from the LIVE DATABASE SCHEMA above.
2. Return the SQL in a code block with \`\`\`sql markers.
3. Explain what the query does.

If you cannot answer with SQL, explain why and suggest alternatives.
`;

      // Build messages for AI
      const messages: any[] = [
        { role: "system", content: schemaContext },
        ...conversationHistory,
        { role: "user", content: question }
      ];

      // Get AI response
      const aiResponse = await openai.chat.completions.create({
        model: "gpt-4.1",
        messages,
        max_completion_tokens: 2048,
      });

      const aiMessage = aiResponse.choices[0]?.message?.content || "";
      
      // Extract SQL from response if present
      const sqlMatch = aiMessage.match(/```sql\n([\s\S]*?)```/);
      let queryResult = null;
      
      if (sqlMatch && sqlMatch[1]) {
        const sql = sqlMatch[1].trim();
        
        // Server-side framer filtering enforcement for AI-generated SQL
        if (!framerContext.isAdmin && framerContext.framerId) {
          const sqlLower = sql.toLowerCase();
          const framerTables = ['sale', 'customer', 'saleline', 'job'];
          const usesFramerTable = framerTables.some(table => 
            sqlLower.includes(`from ${table}`) || 
            sqlLower.includes(`join ${table}`) ||
            new RegExp(`\\b${table}\\b`).test(sqlLower)
          );
          
          if (usesFramerTable) {
            const hasFramerFilter = sqlLower.includes(framerContext.framerId.toLowerCase());
            
            if (!hasFramerFilter) {
              queryResult = {
                sql,
                error: `Access denied: This query involves framer-specific data but does not include your Framer ID (${framerContext.framerId}). Please ask the AI to filter by your Framer ID.`
              };
              
              res.json({
                answer: aiMessage + `\n\n**Note:** The generated query was blocked because it doesn't include your Framer ID filter. Please ask me to include your Framer ID (${framerContext.framerId}) in the query.`,
                queryResult,
                conversationHistory: [
                  ...conversationHistory,
                  { role: "user", content: question },
                  { role: "assistant", content: aiMessage }
                ]
              });
              return;
            }
          }
        }
        
        try {
          const result = await executeMySQL(dataSource.config, sql);
          queryResult = {
            sql,
            columns: result.columns,
            rows: result.rows.slice(0, 100), // Limit to 100 rows
            totalRows: result.rows.length
          };
        } catch (sqlErr: any) {
          queryResult = {
            sql,
            error: sqlErr.message
          };
        }
      }

      res.json({
        answer: aiMessage,
        queryResult,
        conversationHistory: [
          ...conversationHistory,
          { role: "user", content: question },
          { role: "assistant", content: aiMessage }
        ]
      });
    } catch (err: any) {
      console.error("AI Assistant Error:", err);
      res.status(500).json({ message: friendlyMysqlError(err) });
    }
  });

  return httpServer;
}
