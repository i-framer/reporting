import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getAuthToken } from "@/hooks/use-auth";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    let message = text;
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed.message === "string") {
        message = parsed.message;
      }
    } catch {
      // Not JSON, keep the raw text
    }
    const error = new Error(message) as Error & { status?: number };
    error.status = res.status;
    throw error;
  }
}

// Build headers with auth token if available
function getAuthHeaders(includeContentType: boolean = false): HeadersInit {
  const headers: HeadersInit = {};
  const token = getAuthToken();
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  if (includeContentType) {
    headers["Content-Type"] = "application/json";
  }
  
  return headers;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: getAuthHeaders(!!data),
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
      headers: getAuthHeaders(),
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
