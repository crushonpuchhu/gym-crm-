"use client";
import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { api, refreshAccessToken, setAccessToken } from "./api";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  /** GymFlow vendor staff: unlocks /platform and has no brand membership. */
  isPlatformAdmin?: boolean;
}

export interface OrgMembership {
  organization: { id: string; name: string; slug: string };
  role: string;
}

export interface ImpersonationInfo {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  reason: string;
}

const IMPERSONATION_KEY = "gymflow-impersonation";

interface AuthContextType {
  user: SessionUser | null;
  organizationId: string | null;
  role: string | null;
  memberships: OrgMembership[];
  impersonation: ImpersonationInfo | null;
  loading: boolean;
  login: (
    email: string,
    password: string,
  ) => Promise<{ isPlatformAdmin: boolean; organizationId: string | null }>;
  register: (input: { email: string; password: string; name: string; organizationName: string }) => Promise<void>;
  acceptInvitation: (token: string, input: { name?: string; password: string }) => Promise<void>;
  switchOrg: (organizationId: string) => Promise<void>;
  startImpersonation: (
    accessToken: string,
    info: ImpersonationInfo,
  ) => void;
  stopImpersonation: () => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [memberships, setMemberships] = useState<OrgMembership[]>([]);
  const [impersonation, setImpersonation] = useState<ImpersonationInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const clearImpersonation = useCallback(() => {
    if (typeof window !== "undefined") window.sessionStorage.removeItem(IMPERSONATION_KEY);
    setImpersonation(null);
  }, []);

  const refresh = useCallback(async () => {
    // A support session survives a reload through sessionStorage; it must not
    // silently turn into a normal platform session.
    if (typeof window !== "undefined") {
      const stored = window.sessionStorage.getItem(IMPERSONATION_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as ImpersonationInfo & { token: string };
          setAccessToken(parsed.token);
          const me = await api<{ user: SessionUser }>("/auth/me");
          setUser(me.user);
          setOrganizationId(parsed.organizationId);
          setMemberships([
            {
              organization: {
                id: parsed.organizationId,
                name: parsed.organizationName,
                slug: parsed.organizationSlug,
              },
              role: "ORG_OWNER",
            },
          ]);
          setImpersonation({
            organizationId: parsed.organizationId,
            organizationName: parsed.organizationName,
            organizationSlug: parsed.organizationSlug,
            reason: parsed.reason,
          });
          setLoading(false);
          return;
        } catch {
          window.sessionStorage.removeItem(IMPERSONATION_KEY);
        }
      }
    }

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
      setImpersonation(null);
    } catch {
      setUser(null);
      setOrganizationId(null);
      setMemberships([]);
      setImpersonation(null);
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
      setImpersonation(null);
      if (typeof window !== "undefined") window.sessionStorage.removeItem(IMPERSONATION_KEY);
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
    const data = await api<{
      accessToken: string;
      user: SessionUser;
      organizationId: string | null;
      isPlatformAdmin: boolean;
    }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    clearImpersonation();
    setAccessToken(data.accessToken);
    setUser(data.user);
    setOrganizationId(data.organizationId ?? null);
    setMemberships(await api<OrgMembership[]>("/auth/memberships"));
    return { isPlatformAdmin: !!data.isPlatformAdmin, organizationId: data.organizationId ?? null };
  }, []);

  const register = useCallback(
    async (input: { email: string; password: string; name: string; organizationName: string }) => {
      const data = await api<{ accessToken: string; user: SessionUser; organization: { id: string } }>("/auth/register", {
        method: "POST",
        body: JSON.stringify(input),
      });
      clearImpersonation();
      setAccessToken(data.accessToken);
      setUser(data.user);
      setOrganizationId(data.organization.id);
      setMemberships(await api<OrgMembership[]>("/auth/memberships"));
    },
    [clearImpersonation],
  );

  const acceptInvitation = useCallback(
    async (token: string, input: { name?: string; password: string }) => {
      const data = await api<{ accessToken: string; user: SessionUser; organization: { id: string } }>(
        `/auth/invitations/${token}/accept`,
        { method: "POST", body: JSON.stringify(input) },
      );
      clearImpersonation();
      setAccessToken(data.accessToken);
      setUser(data.user);
      setOrganizationId(data.organization.id);
      setMemberships(await api<OrgMembership[]>("/auth/memberships"));
    },
    [clearImpersonation],
  );

  const switchOrg = useCallback(async (nextOrgId: string) => {
    const data = await api<{ accessToken: string }>("/auth/switch-org", {
      method: "POST",
      body: JSON.stringify({ organizationId: nextOrgId }),
    });
    setAccessToken(data.accessToken);
    setOrganizationId(nextOrgId);
  }, []);

  /** Enter a read-only support session. The platform token is kept in memory. */
  const startImpersonation = useCallback(
    (accessToken: string, info: ImpersonationInfo) => {
      window.sessionStorage.setItem(
        IMPERSONATION_KEY,
        JSON.stringify({ token: accessToken, ...info }),
      );
      setAccessToken(accessToken);
      setImpersonation(info);
      setOrganizationId(info.organizationId);
      setMemberships([
        {
          organization: { id: info.organizationId, name: info.organizationName, slug: info.organizationSlug },
          role: "ORG_OWNER",
        },
      ]);
    },
    [],
  );

  /** Return to the platform console and discard the borrowed brand token. */
  const stopImpersonation = useCallback(async () => {
    try {
      const data = await api<{ accessToken: string }>("/auth/stop-impersonation", { method: "POST" });
      setAccessToken(data.accessToken);
    } catch {
      // Token already expired: a normal refresh restores platform access.
    }
    clearImpersonation();
    setOrganizationId(null);
    setMemberships([]);
  }, [clearImpersonation]);

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
      setImpersonation(null);
      if (typeof window !== "undefined") window.sessionStorage.removeItem(IMPERSONATION_KEY);
    }
  }, []);

  const role = impersonation
    ? "ORG_OWNER"
    : memberships.find((m) => m.organization.id === organizationId)?.role ?? null;

  return (
    <AuthContext.Provider
      value={{
        user,
        organizationId,
        role,
        memberships,
        impersonation,
        loading,
        login,
        register,
        acceptInvitation,
        switchOrg,
        startImpersonation,
        stopImpersonation,
        logout,
        refresh,
      }}
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
