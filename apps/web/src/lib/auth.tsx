"use client";
import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { api, setAccessToken } from "./api";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
}

interface AuthContextType {
  user: SessionUser | null;
  organizationId: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: { email: string; password: string; name: string; organizationName: string }) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/auth/refresh", { method: "POST", credentials: "include" });
      if (!res.ok) {
        setUser(null);
        return;
      }
      const body = await res.json();
      setAccessToken(body?.data?.accessToken ?? null);
      const me = await api<{ user: SessionUser; memberships: Array<{ organizationId: string }> }>("/auth/me");
      setUser(me.user);
      setOrganizationId(me.memberships?.[0]?.organizationId ?? null);
    } catch {
      setUser(null);
      setAccessToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api<{ accessToken: string; user: SessionUser; organizationId: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setAccessToken(data.accessToken);
    setUser(data.user);
    setOrganizationId(data.organizationId);
  }, []);

  const register = useCallback(
    async (input: { email: string; password: string; name: string; organizationName: string }) => {
      const data = await api<{ accessToken: string; user: SessionUser; organization: { id: string } }>("/auth/register", {
        method: "POST",
        body: JSON.stringify(input),
      });
      setAccessToken(data.accessToken);
      setUser(data.user);
      setOrganizationId(data.organization.id);
    },
    [],
  );

  const logout = useCallback(async () => {
    await api("/auth/logout", { method: "POST" }).catch(() => undefined);
    setAccessToken(null);
    setUser(null);
    setOrganizationId(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, organizationId, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
