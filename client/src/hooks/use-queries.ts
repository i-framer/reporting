import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";
import { getAuthToken } from "./use-auth";

type InsertSavedQuery = z.infer<typeof api.queries.create.input>;
type UpdateSavedQuery = z.infer<typeof api.queries.update.input>;

function authHeaders(contentType?: boolean): HeadersInit {
  const headers: HeadersInit = {};
  const token = getAuthToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (contentType) headers["Content-Type"] = "application/json";
  return headers;
}

export function useSavedQueries() {
  return useQuery({
    queryKey: [api.queries.list.path],
    queryFn: async () => {
      const res = await fetch(api.queries.list.path, { credentials: "include", headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to fetch saved queries");
      return api.queries.list.responses[200].parse(await res.json());
    },
  });
}

export function useSavedQuery(id: number) {
  return useQuery({
    queryKey: [api.queries.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.queries.get.path, { id });
      const res = await fetch(url, { credentials: "include", headers: authHeaders() });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch saved query");
      return api.queries.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useCreateSavedQuery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertSavedQuery) => {
      const validated = api.queries.create.input.parse(data);
      const res = await fetch(api.queries.create.path, {
        method: api.queries.create.method,
        headers: authHeaders(true),
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to save query");
      return api.queries.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.queries.list.path] }),
  });
}

export function useUpdateSavedQuery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & UpdateSavedQuery) => {
      const validated = api.queries.update.input.parse(updates);
      const url = buildUrl(api.queries.update.path, { id });
      const res = await fetch(url, {
        method: api.queries.update.method,
        headers: authHeaders(true),
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update query");
      return api.queries.update.responses[200].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.queries.list.path] }),
  });
}

export function useDeleteSavedQuery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.queries.delete.path, { id });
      const res = await fetch(url, { method: api.queries.delete.method, credentials: "include", headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to delete query");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.queries.list.path] }),
  });
}
