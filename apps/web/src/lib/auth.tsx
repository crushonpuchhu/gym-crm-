"use client";
import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { api, refreshAccessToken, setAccessToken } from "./api";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
}

export interface OrgMembership {
  organization: { id: string; name: string; slug: string };
  role: string;
}

interface AuthContextType {
  user: SessionUser | null;
  organizationId: string | null;
  role: string | null;
  memberships: OrgMembership[];
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: { email: string; password: string; name: string; organizationName: string }) => Promise<void>;
  acceptInvitation: (token: string, input: { name?: string; password: string }) => Promise<void>;
  switchOrg: (organizationId: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [memberships, setMemberships] = useState<OrgMembership[]>([]);
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
      const orgs = await api<OrgMembership[]>("/auth/memberships");
      setMemberships(orgs);
    } catch {
      setUser(null);
      setOrganizationId(null);
      setMemberships([]);
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
      setMemberships([]);
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
    setMemberships(await api<OrgMembership[]>("/auth/memberships"));
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
      setMemberships(await api<OrgMembership[]>("/auth/memberships"));
    },
    [],
  );

  const acceptInvitation = useCallback(
    async (token: string, input: { name?: string; password: string }) => {
      const data = await api<{ accessToken: string; user: SessionUser; organization: { id: string } }>(
        `/auth/invitations/${token}/accept`,
        { method: "POST", body: JSON.stringify(input) },
      );
      setAccessToken(data.accessToken);
      setUser(data.user);
      setOrganizationId(data.organization.id);
      setMemberships(await api<OrgMembership[]>("/auth/memberships"));
    },
    [],
  );

  const switchOrg = useCallback(async (nextOrgId: string) => {
    const data = await api<{ accessToken: string }>("/auth/switch-org", {
      method: "POST",
      body: JSON.stringify({ organizationId: nextOrgId }),
    });
    setAccessToken(data.accessToken);
    setOrganizationId(nextOrgId);
  }, []);

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
      setMemberships([]);
    }
  }, []);

  const role = memberships.find((m) => m.organization.id === organizationId)?.role ?? null;

  return (
    <AuthContext.Provider
      value={{ user, organizationId, role, memberships, loading, login, register, acceptInvitation, switchOrg, logout, refresh }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
