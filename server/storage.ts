import { db } from "./db";
import { 
  dataSources, savedQueries, dashboards, reports,
  type DataSource, type InsertDataSource,
  type SavedQuery, type InsertSavedQuery,
  type Dashboard, type InsertDashboard,
  type Report, type InsertReport
} from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Data Sources
  getDataSources(): Promise<DataSource[]>;
  getDataSource(id: number): Promise<DataSource | undefined>;
  createDataSource(ds: InsertDataSource): Promise<DataSource>;
  updateDataSource(id: number, ds: Partial<InsertDataSource>): Promise<DataSource>;
  deleteDataSource(id: number): Promise<void>;

  // Saved Queries
  getSavedQueries(): Promise<SavedQuery[]>;
  getSavedQuery(id: number): Promise<SavedQuery | undefined>;
  createSavedQuery(query: InsertSavedQuery): Promise<SavedQuery>;
  updateSavedQuery(id: number, query: Partial<InsertSavedQuery>): Promise<SavedQuery>;
  deleteSavedQuery(id: number): Promise<void>;

  // Dashboards
  getDashboards(): Promise<Dashboard[]>;
  getDashboard(id: number): Promise<Dashboard | undefined>;
  createDashboard(dashboard: InsertDashboard): Promise<Dashboard>;
  updateDashboard(id: number, dashboard: Partial<InsertDashboard>): Promise<Dashboard>;
  deleteDashboard(id: number): Promise<void>;

  // Reports
  getReports(dashboardId: number): Promise<Report[]>;
  createReport(report: InsertReport): Promise<Report>;
  updateReport(id: number, report: Partial<InsertReport>): Promise<Report>;
  deleteReport(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Data Sources
  async getDataSources(): Promise<DataSource[]> {
    return await db.select().from(dataSources);
  }
  async getDataSource(id: number): Promise<DataSource | undefined> {
    const [ds] = await db.select().from(dataSources).where(eq(dataSources.id, id));
    return ds;
  }
  async createDataSource(ds: InsertDataSource): Promise<DataSource> {
    const [newDs] = await db.insert(dataSources).values(ds).returning();
    return newDs;
  }
  async updateDataSource(id: number, updates: Partial<InsertDataSource>): Promise<DataSource> {
    const [updated] = await db.update(dataSources).set(updates).where(eq(dataSources.id, id)).returning();
    return updated;
  }
  async deleteDataSource(id: number): Promise<void> {
    await db.delete(dataSources).where(eq(dataSources.id, id));
  }

  // Saved Queries
  async getSavedQueries(): Promise<SavedQuery[]> {
    return await db.select().from(savedQueries);
  }
  async getSavedQuery(id: number): Promise<SavedQuery | undefined> {
    const [q] = await db.select().from(savedQueries).where(eq(savedQueries.id, id));
    return q;
  }
  async createSavedQuery(query: InsertSavedQuery): Promise<SavedQuery> {
    const [newQ] = await db.insert(savedQueries).values(query).returning();
    return newQ;
  }
  async updateSavedQuery(id: number, updates: Partial<InsertSavedQuery>): Promise<SavedQuery> {
    const [updated] = await db.update(savedQueries).set(updates).where(eq(savedQueries.id, id)).returning();
    return updated;
  }
  async deleteSavedQuery(id: number): Promise<void> {
    await db.delete(savedQueries).where(eq(savedQueries.id, id));
  }

  // Dashboards
  async getDashboards(): Promise<Dashboard[]> {
    return await db.select().from(dashboards);
  }
  async getDashboard(id: number): Promise<Dashboard | undefined> {
    const [d] = await db.select().from(dashboards).where(eq(dashboards.id, id));
    return d;
  }
  async createDashboard(d: InsertDashboard): Promise<Dashboard> {
    const [newD] = await db.insert(dashboards).values(d).returning();
    return newD;
  }
  async updateDashboard(id: number, updates: Partial<InsertDashboard>): Promise<Dashboard> {
    const [updated] = await db.update(dashboards).set(updates).where(eq(dashboards.id, id)).returning();
    return updated;
  }
  async deleteDashboard(id: number): Promise<void> {
    await db.delete(dashboards).where(eq(dashboards.id, id));
  }

  // Reports
  async getReports(dashboardId: number): Promise<Report[]> {
    return await db.select().from(reports).where(eq(reports.dashboardId, dashboardId));
  }
  async createReport(r: InsertReport): Promise<Report> {
    const [newR] = await db.insert(reports).values(r).returning();
    return newR;
  }
  async updateReport(id: number, updates: Partial<InsertReport>): Promise<Report> {
    const [updated] = await db.update(reports).set(updates).where(eq(reports.id, id)).returning();
    return updated;
  }
  async deleteReport(id: number): Promise<void> {
    await db.delete(reports).where(eq(reports.id, id));
  }
}

export const storage = new DatabaseStorage();
