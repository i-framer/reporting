import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";
import { getAuthToken } from "./use-auth";

type InsertDashboard = z.infer<typeof api.dashboards.create.input>;
type UpdateDashboard = z.infer<typeof api.dashboards.update.input>;

function authHeaders(contentType?: boolean): HeadersInit {
  const headers: HeadersInit = {};
  const token = getAuthToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (contentType) headers["Content-Type"] = "application/json";
  return headers;
}

export function useDashboards() {
  return useQuery({
    queryKey: [api.dashboards.list.path],
    queryFn: async () => {
      const res = await fetch(api.dashboards.list.path, { credentials: "include", headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to fetch dashboards");
      return api.dashboards.list.responses[200].parse(await res.json());
    },
  });
}

export function useDashboard(id: number) {
  return useQuery({
    queryKey: [api.dashboards.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.dashboards.get.path, { id });
      const res = await fetch(url, { credentials: "include", headers: authHeaders() });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch dashboard");
      return api.dashboards.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useDashboardReports(id: number) {
  return useQuery({
    queryKey: [api.dashboards.getReports.path, id],
    queryFn: async () => {
      const url = buildUrl(api.dashboards.getReports.path, { id });
      const res = await fetch(url, { credentials: "include", headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to fetch reports");
      return api.dashboards.getReports.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useCreateDashboard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertDashboard) => {
      const validated = api.dashboards.create.input.parse(data);
      const res = await fetch(api.dashboards.create.path, {
        method: api.dashboards.create.method,
        headers: authHeaders(true),
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create dashboard");
      return api.dashboards.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.dashboards.list.path] }),
  });
}

export function useDeleteDashboard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.dashboards.delete.path, { id });
      const res = await fetch(url, { method: api.dashboards.delete.method, credentials: "include", headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to delete dashboard");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.dashboards.list.path] }),
  });
}
