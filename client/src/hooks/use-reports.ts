import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";
import { getAuthToken } from "./use-auth";

type InsertReport = z.infer<typeof api.reports.create.input>;
type UpdateReport = z.infer<typeof api.reports.update.input>;

function authHeaders(contentType?: boolean): HeadersInit {
  const headers: HeadersInit = {};
  const token = getAuthToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (contentType) headers["Content-Type"] = "application/json";
  return headers;
}

export function useCreateReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertReport) => {
      const validated = api.reports.create.input.parse(data);
      const res = await fetch(api.reports.create.path, {
        method: api.reports.create.method,
        headers: authHeaders(true),
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create widget");
      return api.reports.create.responses[201].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      const dashboardUrl = buildUrl(api.dashboards.getReports.path, { id: variables.dashboardId });
      queryClient.invalidateQueries({ queryKey: [dashboardUrl] });
    },
  });
}

export function useDeleteReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, dashboardId }: { id: number; dashboardId: number }) => {
      const url = buildUrl(api.reports.delete.path, { id });
      const res = await fetch(url, { method: api.reports.delete.method, credentials: "include", headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to delete widget");
    },
    onSuccess: (_, variables) => {
      const dashboardUrl = buildUrl(api.dashboards.getReports.path, { id: variables.dashboardId });
      queryClient.invalidateQueries({ queryKey: [dashboardUrl] });
    },
  });
}
