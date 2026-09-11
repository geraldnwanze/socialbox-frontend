"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { clearActiveWorkspaceId, clearTokens, getAccessToken, setTokens } from "@/lib/auth-storage";
import type { User } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!getAccessToken()) {
      // One-time "is there a session to restore" check on mount — localStorage isn't
      // available during SSR, so this genuinely can't be a lazy useState initializer.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsLoading(false);
      return;
    }
    api
      .get<User>("/auth/me", { skipWorkspaceHeader: true })
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.post<AuthResponse>("/auth/login", { email, password }, { skipWorkspaceHeader: true });
      setTokens(res.accessToken, res.refreshToken);
      setUser(res.user);
      router.push("/workspaces");
    },
    [router],
  );

  const register = useCallback(
    async (email: string, password: string, fullName: string) => {
      const res = await api.post<AuthResponse>(
        "/auth/register",
        { email, password, fullName },
        { skipWorkspaceHeader: true },
      );
      setTokens(res.accessToken, res.refreshToken);
      setUser(res.user);
      router.push("/workspaces");
    },
    [router],
  );

  const logout = useCallback(async () => {
    clearTokens();
    clearActiveWorkspaceId();
    setUser(null);
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
