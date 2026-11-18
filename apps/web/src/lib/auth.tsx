"use client";
import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { api, refreshAccessToken, setAccessToken } from "./api";

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
      const token = await refreshAccessToken();
      if (!token) {
        setAccessToken(null);
        setUser(null);
        setOrganizationId(null);
        return;
      }
      const me = await api<{ user: SessionUser; memberships: Array<{ organizationId: string }> }>("/auth/me");
      setUser(me.user);
      setOrganizationId(me.memberships?.[0]?.organizationId ?? null);
    } catch {
      setUser(null);
      setOrganizationId(null);
      setAccessToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // A protected call failed and the refresh token is gone: drop the session.
  useEffect(() => {
    const clear = () => {
      setAccessToken(null);
      setUser(null);
      setOrganizationId(null);
    };
    // Back/forward cache restores the old DOM without re-running the provider.
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) void refresh();
    };
    window.addEventListener("auth:expired", clear);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      window.removeEventListener("auth:expired", clear);
      window.removeEventListener("pageshow", onPageShow);
    };
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
    // Revoke the refresh cookie first; if the request hangs, give up after 4s.
    // Clearing local state before that would leave a valid cookie behind, so a
    // reload would silently sign the user back in.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    try {
      await api("/auth/logout", { method: "POST", signal: controller.signal });
    } catch {
      // Network failure: the local session still ends.
    } finally {
      clearTimeout(timer);
      setAccessToken(null);
      setUser(null);
      setOrganizationId(null);
    }
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
