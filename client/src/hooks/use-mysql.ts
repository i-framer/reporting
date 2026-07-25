import { useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { z } from "zod";
import { getAuthToken } from "./use-auth";

function authHeaders(contentType?: boolean): HeadersInit {
  const headers: HeadersInit = {};
  const token = getAuthToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (contentType) headers["Content-Type"] = "application/json";
  return headers;
}

export function useExecuteSql() {
  return useMutation({
    mutationFn: async (data: { dataSourceId: number; sql: string }) => {
      if (!data.sql.trim()) throw new Error("SQL query cannot be empty");
      
      const validated = api.mysql.execute.input.parse(data);
      const res = await fetch(api.mysql.execute.path, {
        method: api.mysql.execute.method,
        headers: authHeaders(true),
        body: JSON.stringify(validated),
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 400 || res.status === 500) {
          const error = await res.json();
          throw new Error(error.message || "Failed to execute query");
        }
        throw new Error("Failed to execute query");
      }
      
      return api.mysql.execute.responses[200].parse(await res.json());
    },
  });
}

export function useTestConnection() {
  return useMutation({
    mutationFn: async (data: z.infer<typeof api.mysql.testConnection.input>) => {
      const validated = api.mysql.testConnection.input.parse(data);
      const res = await fetch(api.mysql.testConnection.path, {
        method: api.mysql.testConnection.method,
        headers: authHeaders(true),
        body: JSON.stringify(validated),
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Connection test failed");
      }

      return api.mysql.testConnection.responses[200].parse(await res.json());
    },
  });
}
