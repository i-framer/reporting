import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface AuthUser {
  framerId: string | null;
  framerName: string | null;
  isAdmin: boolean;
}

const AUTH_TOKEN_KEY = "datadeck_auth_token";

export function getAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

async function fetchUser(): Promise<AuthUser | null> {
  const token = getAuthToken();
  const headers: HeadersInit = {};
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch("/api/auth/user", {
    credentials: "include",
    headers,
  });

  if (response.status === 401) {
    clearAuthToken();
    return null;
  }

  if (!response.ok) {
    throw new Error(`${response.status}: ${response.statusText}`);
  }

  return response.json();
}

async function logout(): Promise<void> {
  const token = getAuthToken();
  const headers: HeadersInit = {};
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
    headers,
  });
  
  clearAuthToken();
}

export function useAuth() {
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/user"],
    queryFn: fetchUser,
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.isAdmin ?? false,
    framerId: user?.framerId ?? null,
    framerName: user?.framerName ?? null,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}
