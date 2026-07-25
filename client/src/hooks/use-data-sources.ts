import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";
import { getAuthToken } from "./use-auth";

type InsertDataSource = z.infer<typeof api.dataSources.create.input>;
type UpdateDataSource = z.infer<typeof api.dataSources.update.input>;

function authHeaders(contentType?: boolean): HeadersInit {
  const headers: HeadersInit = {};
  const token = getAuthToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (contentType) headers["Content-Type"] = "application/json";
  return headers;
}

export function useDataSources() {
  return useQuery({
    queryKey: [api.dataSources.list.path],
    queryFn: async () => {
      const res = await fetch(api.dataSources.list.path, { credentials: "include", headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to fetch data sources");
      return api.dataSources.list.responses[200].parse(await res.json());
    },
  });
}

export function useDataSource(id: number) {
  return useQuery({
    queryKey: [api.dataSources.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.dataSources.get.path, { id });
      const res = await fetch(url, { credentials: "include", headers: authHeaders() });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch data source");
      return api.dataSources.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useCreateDataSource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertDataSource) => {
      const validated = api.dataSources.create.input.parse(data);
      const res = await fetch(api.dataSources.create.path, {
        method: api.dataSources.create.method,
        headers: authHeaders(true),
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create data source");
      return api.dataSources.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.dataSources.list.path] }),
  });
}

export function useUpdateDataSource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & UpdateDataSource) => {
      const validated = api.dataSources.update.input.parse(updates);
      const url = buildUrl(api.dataSources.update.path, { id });
      const res = await fetch(url, {
        method: api.dataSources.update.method,
        headers: authHeaders(true),
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update data source");
      return api.dataSources.update.responses[200].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.dataSources.list.path] }),
  });
}

export function useDeleteDataSource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.dataSources.delete.path, { id });
      const res = await fetch(url, { method: api.dataSources.delete.method, credentials: "include", headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to delete data source");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.dataSources.list.path] }),
  });
}
