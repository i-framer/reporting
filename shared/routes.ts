import { z } from 'zod';
import { 
  insertDataSourceSchema, 
  insertSavedQuerySchema, 
  insertDashboardSchema, 
  insertReportSchema,
  dataSources,
  savedQueries,
  dashboards,
  reports
} from './schema';

// ============================================
// SHARED ERROR SCHEMAS
// ============================================
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

// ============================================
// API CONTRACT
// ============================================
export const api = {
  // MySQL Execution
  mysql: {
    execute: {
      method: 'POST' as const,
      path: '/api/mysql/execute',
      input: z.object({
        dataSourceId: z.coerce.number(),
        sql: z.string().min(1),
      }),
      responses: {
        200: z.object({
          columns: z.array(z.string()),
          rows: z.array(z.record(z.any())),
          executionTimeMs: z.number().optional(),
        }),
        400: errorSchemas.validation,
        500: errorSchemas.internal,
      },
    },
    testConnection: {
      method: 'POST' as const,
      path: '/api/mysql/test',
      input: insertDataSourceSchema,
      responses: {
        200: z.object({ success: z.boolean(), message: z.string() }),
        400: errorSchemas.validation,
      },
    },
  },

  // Data Sources
  dataSources: {
    list: {
      method: 'GET' as const,
      path: '/api/data-sources',
      responses: {
        200: z.array(z.custom<typeof dataSources.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/data-sources/:id',
      responses: {
        200: z.custom<typeof dataSources.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/data-sources',
      input: insertDataSourceSchema,
      responses: {
        201: z.custom<typeof dataSources.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/data-sources/:id',
      input: insertDataSourceSchema.partial(),
      responses: {
        200: z.custom<typeof dataSources.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/data-sources/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },

  // Saved Queries
  queries: {
    list: {
      method: 'GET' as const,
      path: '/api/queries',
      responses: {
        200: z.array(z.custom<typeof savedQueries.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/queries',
      input: insertSavedQuerySchema,
      responses: {
        201: z.custom<typeof savedQueries.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/queries/:id',
      responses: {
        200: z.custom<typeof savedQueries.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    run: {
      method: 'POST' as const,
      path: '/api/queries/:id/run',
      input: z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }).optional(),
      responses: {
        200: z.object({
          columns: z.array(z.string()),
          rows: z.array(z.record(z.any())),
          executionTimeMs: z.number().optional(),
        }),
        403: errorSchemas.validation,
        404: errorSchemas.notFound,
        500: errorSchemas.internal,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/queries/:id',
      input: insertSavedQuerySchema.partial(),
      responses: {
        200: z.custom<typeof savedQueries.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/queries/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },

  // Dashboards
  dashboards: {
    list: {
      method: 'GET' as const,
      path: '/api/dashboards',
      responses: {
        200: z.array(z.custom<typeof dashboards.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/dashboards',
      input: insertDashboardSchema,
      responses: {
        201: z.custom<typeof dashboards.$inferSelect>(),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/dashboards/:id',
      responses: {
        200: z.custom<typeof dashboards.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    // We'll fetch reports separately or include them? Let's fetch separately for now or via a specific endpoint
    getReports: {
       method: 'GET' as const,
       path: '/api/dashboards/:id/reports',
       responses: {
         200: z.array(z.custom<typeof reports.$inferSelect>()),
       },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/dashboards/:id',
      input: insertDashboardSchema.partial(),
      responses: {
        200: z.custom<typeof dashboards.$inferSelect>(),
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/dashboards/:id',
      responses: {
        204: z.void(),
      },
    },
  },

  // Report builders (server-computed, tenant-scoped). Clients send validated
  // filters, never raw SQL. The server builds parameterized SQL scoped to the
  // caller's own FramerID.
  reportBuilders: {
    cuttingList: {
      method: 'POST' as const,
      path: '/api/reports/cutting-list',
      input: z.object({
        itemType: z.enum(['moulding', 'matboard', 'covering', 'backing']),
        completion: z.enum(['incomplete', 'complete', 'all']),
        saleType: z.enum(['orders_invoices', 'orders', 'invoices', 'quotes', 'all']),
        startDate: z.string(),
        endDate: z.string(),
      }),
      responses: { 200: z.any(), 403: errorSchemas.validation, 500: errorSchemas.internal },
    },
    jobList: {
      method: 'POST' as const,
      path: '/api/reports/job-list',
      input: z.object({
        saleType: z.enum(['orders_invoices', 'orders', 'invoices', 'quotes', 'all']),
        completion: z.enum(['incomplete', 'complete', 'all']),
        collection: z.enum(['uncollected', 'collected', 'all']),
        startDate: z.string(),
        endDate: z.string(),
        dateType: z.enum(['created', 'due']),
        orderBy: z.enum(['created', 'due', 'number', 'customer', 'description']),
        orderDir: z.enum(['asc', 'desc']),
        includeHidden: z.boolean(),
        includeAmounts: z.boolean(),
      }),
      responses: { 200: z.any(), 403: errorSchemas.validation, 500: errorSchemas.internal },
    },
  },

  // Framer Dashboard (server-computed, tenant-scoped metrics)
  framerDashboard: {
    overview: {
      method: 'POST' as const,
      path: '/api/framer-dashboard/overview',
      responses: { 200: z.any(), 403: errorSchemas.validation, 500: errorSchemas.internal },
    },
    today: {
      method: 'POST' as const,
      path: '/api/framer-dashboard/today',
      responses: { 200: z.any(), 403: errorSchemas.validation, 500: errorSchemas.internal },
    },
    period: {
      method: 'POST' as const,
      path: '/api/framer-dashboard/period',
      input: z.object({ from: z.string(), to: z.string() }),
      responses: { 200: z.any(), 403: errorSchemas.validation, 500: errorSchemas.internal },
    },
    calendar: {
      method: 'POST' as const,
      path: '/api/framer-dashboard/calendar',
      input: z.object({ year: z.coerce.number(), month: z.coerce.number() }),
      responses: { 200: z.any(), 403: errorSchemas.validation, 500: errorSchemas.internal },
    },
  },

  // Reports (Individual Viz Widgets)
  reports: {
    create: {
      method: 'POST' as const,
      path: '/api/reports',
      input: insertReportSchema,
      responses: {
        201: z.custom<typeof reports.$inferSelect>(),
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/reports/:id',
      input: insertReportSchema.partial(),
      responses: {
        200: z.custom<typeof reports.$inferSelect>(),
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/reports/:id',
      responses: {
        204: z.void(),
      },
    },
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
