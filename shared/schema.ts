import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Import Auth schemas (REQUIRED by Replit Auth)
export * from "./models/auth";

// Import Chat schemas for AI assistant
export * from "./models/chat";

// === TABLE DEFINITIONS ===

// Data Sources (User's MySQL databases)
export const dataSources = pgTable("data_sources", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull().default("mysql"),
  // Storing config as JSON. For MVP, we might store connection details here.
  // WARNING: In production, secrets should be encrypted or stored securely.
  // For this prototype, we'll store them in the DB but advise user caution.
  config: jsonb("config").notNull(), 
  createdAt: timestamp("created_at").defaultNow(),
});

// Saved Queries (SQL queries)
export const savedQueries = pgTable("saved_queries", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  dataSourceId: integer("data_source_id").notNull(), // Linked to a data source
  sql: text("sql").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Dashboards (Collections of visualizations)
export const dashboards = pgTable("dashboards", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Reports/Widgets (Visualizations on a dashboard)
export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  dashboardId: integer("dashboard_id").notNull(),
  queryId: integer("query_id").notNull(), // The source data
  type: text("type").notNull(), // 'table', 'bar', 'line', 'pie', 'single_value'
  title: text("title").notNull(),
  config: jsonb("config").notNull(), // Viz configuration (x-axis column, y-axis column, colors, etc)
  layout: jsonb("layout").notNull(), // Position/size on the grid {x, y, w, h}
  createdAt: timestamp("created_at").defaultNow(),
});


// === SCHEMAS ===

export const insertDataSourceSchema = createInsertSchema(dataSources).omit({ id: true, createdAt: true });
export const insertSavedQuerySchema = createInsertSchema(savedQueries).omit({ id: true, createdAt: true });
export const insertDashboardSchema = createInsertSchema(dashboards).omit({ id: true, createdAt: true });
export const insertReportSchema = createInsertSchema(reports).omit({ id: true, createdAt: true });

// === EXPLICIT API TYPES ===

export type DataSource = typeof dataSources.$inferSelect;
export type InsertDataSource = z.infer<typeof insertDataSourceSchema>;

export type SavedQuery = typeof savedQueries.$inferSelect;
export type InsertSavedQuery = z.infer<typeof insertSavedQuerySchema>;

export type Dashboard = typeof dashboards.$inferSelect;
export type InsertDashboard = z.infer<typeof insertDashboardSchema>;

export type Report = typeof reports.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;

// Request Types
export type ExecuteSqlRequest = {
  dataSourceId: number;
  sql: string;
};

// Response Types
export type ExecuteSqlResponse = {
  columns: string[];
  rows: Record<string, any>[];
  error?: string;
  executionTimeMs?: number;
};
