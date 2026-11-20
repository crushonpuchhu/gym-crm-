"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  DialogActions,
  LinearProgress,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { Stack } from "@/components/mui-stack";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ErrorState, LoadingSkeleton, Modal, PageHeader, Panel, StatCard, StatusChip, TableShell } from "@/components/kit";
import {
  Activity,
  Building2,
  CalendarClock,
  CreditCard,
  Download,
  Eye,
  KeyRound,
  Search,
  ShieldCheck,
  ShieldOff,
  Users,
} from "lucide-react";
import { TONES } from "@/palette";

interface Overview {
  totals: {
    organizations: number;
    activeOrganizations: number;
    suspendedOrganizations: number;
    trialing: number;
    paying: number;
    users: number;
    members: number;
    staff: number;
    mrr: number;
    arpu: number;
    trialConversion: number;
    trialsEnding7d: number;
    trialsOverdue: number;
    churned30d: number;
    activeOrganizations7d: number;
    newOrganizations30d: number;
  };
  byPlan: Record<string, number>;
  recentOrganizations: Array<{
    id: string;
    name: string;
    slug: string;
    plan: string;
    status: string;
    createdAt: string;
    members: number;
    staff: number;
    prospects: number;
  }>;
}

interface OrgRow {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  currency: string;
  createdAt: string;
  staff: number;
  members: number;
  subscriptionStatus: string;
  quotaStaff: number;
  quotaMembers: number;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  lastActivityAt: string | null;
}

interface OrgDetail {
  organization: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    status: string;
    currency: string;
    timezone: string;
    createdAt: string;
    updatedAt: string;
  };
  subscription: {
    id: string;
    plan: string;
    status: string;
    quotaStaff: number;
    quotaMembers: number;
    currentPeriodEnd: string | null;
    trialEndsAt: string | null;
    updatedAt: string;
  } | null;
  usage: {
    members: number;
    prospects: number;
    staff: number;
    locations: number;
    pendingInvitations: number;
  };
  staff: Array<{ id: string; name: string; email: string; role: string; joinedAt: string; emailVerified: boolean }>;
  recentActivity: Array<{
    id: string;
    action: string;
    entityType: string;
    createdAt: string;
    user: { name: string; email: string } | null;
  }>;
}

interface PlatformUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  isPlatformAdmin: boolean;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  memberships: Array<{ role: string; organization: { id: string; name: string } }>;
}

interface ActivityRow {
  id: string;
  action: string;
  entityType: string;
  createdAt: string;
  ip: string | null;
  organization: { id: string; name: string };
  user: { name: string; email: string } | null;
}

interface PlatformLogRow {
  id: string;
  action: string;
  createdAt: string;
  ip: string | null;
  metadata: Record<string, unknown> | null;
  actor: { name: string; email: string };
  targetUser: { name: string; email: string } | null;
  organization: { id: string; name: string } | null;
}

const PLAN_LABEL: Record<string, string> = { STARTER: "Starter", GROWTH: "Growth", SCALE: "Scale" };
const SUB_STATUSES = ["TRIAL", "ACTIVE", "PAST_DUE", "CANCELLED", "EXPIRED"];
const TABS = [
  { key: "gyms", label: "Gyms" },
  { key: "users", label: "People" },
  { key: "log", label: "Platform log" },
  { key: "activity", label: "Tenant activity" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

function money(value: number) {
  return `$${value.toLocaleString("en-US")}`;
}

function when(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function trialLabel(value: string | null) {
  if (!value) return "—";
  const ends = new Date(value).getTime();
  const days = Math.ceil((ends - Date.now()) / 86_400_000);
  if (days < 0) return `ended ${Math.abs(days)}d ago`;
  if (days === 0) return "ends today";
  if (days <= 14) return `${days}d left`;
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function trialTone(value: string | null) {
  if (!value) return "text.disabled";
  const days = Math.ceil((new Date(value).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return "error.main";
  if (days <= 3) return "warning.main";
  return "text.secondary";
}

function planTone(plan: string) {
  if (plan === "SCALE") return TONES.violet.main;
  if (plan === "GROWTH") return TONES.indigo.main;
  return TONES.cyan.main;
}

export default function PlatformPage() {
  const router = useRouter();
  const { startImpersonation } = useAuth();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [overviewError, setOverviewError] = useState("");
  const [tab, setTab] = useState<TabKey>("gyms");

  const [gyms, setGyms] = useState<OrgRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [gymError, setGymError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const [users, setUsers] = useState<PlatformUser[] | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [userError, setUserError] = useState("");

  const [activity, setActivity] = useState<ActivityRow[] | null>(null);
  const [activityError, setActivityError] = useState("");

  const [log, setLog] = useState<PlatformLogRow[] | null>(null);
  const [logError, setLogError] = useState("");
  const [logPage, setLogPage] = useState(1);
  const [logPages, setLogPages] = useState(1);

  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<OrgDetail | null>(null);
  const [detailError, setDetailError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [busyUser, setBusyUser] = useState<string | null>(null);
  const [userActionError, setUserActionError] = useState("");
  const [trialDays, setTrialDays] = useState(14);
  const [exporting, setExporting] = useState(false);
  const [form, setForm] = useState({
    status: "active",
    plan: "STARTER",
    subscriptionStatus: "TRIAL",
    quotaStaff: 5,
    quotaMembers: 500,
  });

  const loadOverview = useCallback(async () => {
    setOverviewError("");
    try {
      setOverview(await api<Overview>("/platform/overview"));
    } catch (err: any) {
      setOverviewError(err?.message || "Could not load product metrics");
    }
  }, []);

  const loadGyms = useCallback(async () => {
    setGymError("");
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (status) params.set("status", status);
      params.set("limit", "50");
      const data = await api<{ items: OrgRow[]; total: number }>(`/platform/organizations?${params.toString()}`);
      setGyms(data.items);
      setTotal(data.total);
    } catch (err: any) {
      setGymError(err?.message || "Could not load gym brands");
    }
  }, [search, status]);

  const loadUsers = useCallback(async () => {
    setUserError("");
    try {
      const params = new URLSearchParams();
      if (userSearch.trim()) params.set("search", userSearch.trim());
      setUsers(await api<PlatformUser[]>(`/platform/users?${params.toString()}`));
    } catch (err: any) {
      setUserError(err?.message || "Could not load people");
    }
  }, [userSearch]);

  const loadActivity = useCallback(async () => {
    setActivityError("");
    try {
      setActivity(await api<ActivityRow[]>("/platform/activity"));
    } catch (err: any) {
      setActivityError(err?.message || "Could not load activity");
    }
  }, []);

  const loadLog = useCallback(async (page = 1) => {
    setLogError("");
    try {
      const data = await api<{ items: PlatformLogRow[]; total: number; pages: number }>(
        `/platform/audit?page=${page}&limit=50`,
      );
      setLog(data.items);
      setLogPage(page);
      setLogPages(data.pages);
    } catch (err: any) {
      setLogError(err?.message || "Could not load the platform log");
    }
  }, []);

  useEffect(() => {
    void loadOverview();
    void loadGyms();
  }, [loadOverview, loadGyms]);

  useEffect(() => {
    if (tab === "users" && !users) void loadUsers();
    if (tab === "activity" && !activity) void loadActivity();
    if (tab === "log" && !log) void loadLog();
  }, [tab, users, activity, log, loadUsers, loadActivity, loadLog]);

  const openOrg = async (id: string) => {
    setSelected(id);
    setDetail(null);
    setDetailError("");
    setSaveError("");
    try {
      const data = await api<OrgDetail>(`/platform/organizations/${id}`);
      setDetail(data);
      setForm({
        status: data.organization.status,
        plan: data.organization.plan,
        subscriptionStatus: data.subscription?.status ?? "TRIAL",
        quotaStaff: data.subscription?.quotaStaff ?? 5,
        quotaMembers: data.subscription?.quotaMembers ?? 500,
      });
    } catch (err: any) {
      setDetailError(err?.message || "Could not load this gym");
    }
  };

  const closeOrg = () => {
    setSelected(null);
    setDetail(null);
    setDetailError("");
    setSaveError("");
  };

  const saveOrg = async () => {
    if (!detail) return;
    const suspending = form.status === "suspended" && detail.organization.status !== "suspended";
    if (
      suspending &&
      !window.confirm(
        `Suspend ${detail.organization.name}? Staff lose access immediately and every tenant API call returns org_suspended. Nothing is deleted.`,
      )
    ) {
      return;
    }
    setSaving(true);
    setSaveError("");
    try {
      await api(`/platform/organizations/${detail.organization.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: form.status,
          plan: form.plan,
          subscriptionStatus: form.subscriptionStatus,
          quotaStaff: Number(form.quotaStaff),
          quotaMembers: Number(form.quotaMembers),
        }),
      });
      await Promise.all([loadGyms(), loadOverview(), openOrg(detail.organization.id)]);
    } catch (err: any) {
      setSaveError(err?.message || "Could not save changes");
    } finally {
      setSaving(false);
    }
  };

  const updatePerson = async (
    person: PlatformUser,
    patch: { isActive?: boolean; isPlatformAdmin?: boolean },
    confirmText: string,
  ) => {
    if (!window.confirm(confirmText)) return;
    setBusyUser(person.id);
    setUserActionError("");
    try {
      await api(`/platform/users/${person.id}`, { method: "PATCH", body: JSON.stringify(patch) });
      await Promise.all([loadUsers(), loadOverview()]);
    } catch (err: any) {
      setUserActionError(err?.message || "Could not update this person");
    } finally {
      setBusyUser(null);
    }
  };

  const revokeSessions = async (person: PlatformUser) => {
    if (!window.confirm(`Sign ${person.name} out of every device? They must sign in again.`)) return;
    setBusyUser(person.id);
    setUserActionError("");
    try {
      await api(`/platform/users/${person.id}/revoke-sessions`, { method: "POST" });
    } catch (err: any) {
      setUserActionError(err?.message || "Could not revoke sessions");
    } finally {
      setBusyUser(null);
    }
  };

  const extendTrial = async (days: number) => {
    if (!detail) return;
    setSaving(true);
    setSaveError("");
    try {
      await api(`/platform/organizations/${detail.organization.id}/trial`, {
        method: "POST",
        body: JSON.stringify({ days }),
      });
      await Promise.all([openOrg(detail.organization.id), loadGyms(), loadOverview()]);
    } catch (err: any) {
      setSaveError(err?.message || "Could not change the trial");
    } finally {
      setSaving(false);
    }
  };

  const viewAsGym = async () => {
    if (!detail) return;
    const reason = window.prompt(
      `Open a read-only support view of ${detail.organization.name}?\n\nThe session is logged and every write is blocked. Type a short reason:`,
      "Support investigation",
    );
    if (!reason || reason.trim().length < 5) return;
    setSaving(true);
    setSaveError("");
    try {
      const data = await api<{
        accessToken: string;
        organization: { id: string; name: string; slug: string };
        reason: string;
      }>(`/platform/organizations/${detail.organization.id}/impersonate`, {
        method: "POST",
        body: JSON.stringify({ reason: reason.trim() }),
      });
      startImpersonation(data.accessToken, {
        organizationId: data.organization.id,
        organizationName: data.organization.name,
        organizationSlug: data.organization.slug,
        reason: data.reason,
      });
      router.push("/dashboard");
    } catch (err: any) {
      setSaveError(err?.message || "Could not start the support view");
    } finally {
      setSaving(false);
    }
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const { getAccessToken } = await import("@/lib/api");
      const res = await fetch("/api/v1/platform/export/gyms.csv", {
        headers: { Authorization: `Bearer ${getAccessToken() ?? ""}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "gymflow-gyms.csv";
      link.click();
      URL.revokeObjectURL(url);
      void loadLog(1);
    } catch {
      setGymError("Could not export the gym list");
    } finally {
      setExporting(false);
    }
  };

  const planTotal = overview ? Object.values(overview.byPlan).reduce((sum, count) => sum + count, 0) : 0;

  if (overviewError && !overview) {
    return <ErrorState message={overviewError} onRetry={() => void loadOverview()} />;
  }

  return (
    <Box>
      <PageHeader
        title="Product overview"
        subtitle="Every gym brand running GymFlow: adoption, usage and commercial state."
        actions={
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Download size={15} />}
              disabled={exporting}
              onClick={() => void exportCsv()}
            >
              {exporting ? "Exporting…" : "Export CSV"}
            </Button>
            <Button variant="outlined" size="small" startIcon={<Activity size={15} />} onClick={() => void loadOverview()}>
              Refresh
            </Button>
          </Stack>
        }
      />

      {overview ? (
        <Box
          sx={{
            display: "grid",
            gap: 2,
            mb: 3,
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" },
          }}
        >
          <StatCard
            label="Gym brands"
            value={overview.totals.organizations}
            sub={`${overview.totals.activeOrganizations} active · ${overview.totals.suspendedOrganizations} suspended`}
            icon={Building2}
            tone="indigo"
          />
          <StatCard
            label="Estimated MRR"
            value={money(overview.totals.mrr)}
            sub={`${overview.totals.paying} paying · ${overview.totals.trialing} on trial`}
            icon={CreditCard}
            tone="emerald"
          />
          <StatCard
            label="Staff seats"
            value={overview.totals.staff}
            sub={`${overview.totals.users} people with a login`}
            icon={ShieldCheck}
            tone="violet"
          />
          <StatCard
            label="Members managed"
            value={overview.totals.members.toLocaleString("en-US")}
            sub={`${overview.totals.newOrganizations30d} new gyms in 30 days`}
            icon={Users}
            tone="cyan"
          />
        </Box>
      ) : (
        <LoadingSkeleton rows={2} />
      )}

      <Stack direction="row" spacing={0.5} sx={{ mb: 2.5, flexWrap: "wrap" }}>
        {TABS.map((item) => {
          const active = tab === item.key;
          return (
            <Button
              key={item.key}
              size="small"
              onClick={() => setTab(item.key)}
              sx={{
                borderRadius: 99,
                px: 2,
                color: active ? "var(--gf-chip-solid-text)" : "text.secondary",
                backgroundColor: active ? "var(--gf-accent)" : "transparent",
                "&:hover": { backgroundColor: active ? "var(--gf-accent)" : "action.hover" },
              }}
            >
              {item.label}
              {item.key === "gyms" && gyms ? ` · ${total}` : ""}
            </Button>
          );
        })}
      </Stack>

      {tab === "gyms" ? (
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) 320px" }, alignItems: "start" }}>
          <Box sx={{ minWidth: 0 }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 1.5 }}>
              <TextField
                size="small"
                placeholder="Search gym name or slug"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void loadGyms();
                }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <Box sx={{ display: "flex", mr: 1, color: "text.secondary" }}>
                        <Search size={15} />
                      </Box>
                    ),
                  },
                }}
                sx={{ minWidth: 280, "& .MuiOutlinedInput-root": { backgroundColor: "background.paper" } }}
              />
              <TextField
                select
                size="small"
                value={status || "all"}
                onChange={(event) => setStatus(event.target.value === "all" ? "" : event.target.value)}
                sx={{ minWidth: 150, "& .MuiOutlinedInput-root": { backgroundColor: "background.paper" } }}
              >
                <MenuItem value="all">All statuses</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="suspended">Suspended</MenuItem>
              </TextField>
              <Button variant="contained" size="small" onClick={() => void loadGyms()}>
                Apply
              </Button>
            </Stack>

            {gymError ? <Alert severity="error" sx={{ mb: 2 }}>{gymError}</Alert> : null}

            {!gyms ? (
              <LoadingSkeleton rows={6} />
            ) : (
              <TableShell>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Gym brand</TableCell>
                      <TableCell>Plan</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Trial</TableCell>
                      <TableCell>Staff</TableCell>
                      <TableCell>Members</TableCell>
                      <TableCell>Last activity</TableCell>
                      <TableCell align="right" />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {gyms.map((gym) => (
                      <TableRow key={gym.id} hover>
                        <TableCell>
                          <Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>{gym.name}</Typography>
                          <Typography variant="caption" sx={{ color: "text.secondary" }}>
                            {gym.slug}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}>
                            <Box sx={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: planTone(gym.plan) }} />
                            <Typography variant="caption" sx={{ fontWeight: 600 }}>
                              {PLAN_LABEL[gym.plan] ?? gym.plan}
                            </Typography>
                          </Box>
                          <Typography variant="caption" sx={{ display: "block", color: "text.disabled" }}>
                            {gym.subscriptionStatus.toLowerCase().replace("_", " ")}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <StatusChip status={gym.status} />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ color: trialTone(gym.trialEndsAt) }}>
                            {trialLabel(gym.trialEndsAt)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {gym.staff} / {gym.quotaStaff}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {gym.members.toLocaleString("en-US")} / {gym.quotaMembers.toLocaleString("en-US")}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ color: "text.secondary" }}>
                            {when(gym.lastActivityAt)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Button size="small" onClick={() => void openOrg(gym.id)}>
                            Manage
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {gyms.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8}>
                          <Typography variant="body2" sx={{ color: "text.secondary", py: 2 }}>
                            No gym brands match this filter.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </TableShell>
            )}
          </Box>

          <Stack spacing={2}>
            {overview ? (
              <Panel>
                <Typography variant="overline" sx={{ color: "text.secondary" }}>
                  Revenue health
                </Typography>
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 1.25, mt: 1.5 }}>
                  {[
                    { label: "ARPU", value: money(overview.totals.arpu) },
                    { label: "Trial conversion", value: `${overview.totals.trialConversion}%` },
                    { label: "Trials ending 7d", value: overview.totals.trialsEnding7d },
                    { label: "Overdue trials", value: overview.totals.trialsOverdue },
                    { label: "Churned 30d", value: overview.totals.churned30d },
                    { label: "Active 7d", value: overview.totals.activeOrganizations7d },
                  ].map((metric) => (
                    <Box key={metric.label}>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        {metric.label}
                      </Typography>
                      <Typography sx={{ fontSize: 17, fontWeight: 700, lineHeight: 1.2 }}>{metric.value}</Typography>
                    </Box>
                  ))}
                </Box>
                <Typography variant="caption" sx={{ display: "block", mt: 1.5, color: "text.disabled" }}>
                  Conversion counts paying brands over paying plus trialing.
                </Typography>
              </Panel>
            ) : null}

            {overview ? (
              <Panel>
                <Typography variant="overline" sx={{ color: "text.secondary" }}>
                  Plan mix
                </Typography>
                <Stack spacing={1.5} sx={{ mt: 1.5 }}>
                  {(["STARTER", "GROWTH", "SCALE"] as const).map((plan) => {
                    const count = overview.byPlan[plan] ?? 0;
                    const pct = planTotal ? (count / planTotal) * 100 : 0;
                    return (
                      <Box key={plan}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="caption" sx={{ fontWeight: 600 }}>
                            {PLAN_LABEL[plan]}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "text.secondary" }}>
                            {count}
                          </Typography>
                        </Stack>
                        <LinearProgress
                          variant="determinate"
                          value={pct}
                          sx={{
                            mt: 0.5,
                            height: 6,
                            borderRadius: 99,
                            backgroundColor: "action.hover",
                            "& .MuiLinearProgress-bar": { backgroundColor: planTone(plan) },
                          }}
                        />
                      </Box>
                    );
                  })}
                </Stack>
              </Panel>
            ) : null}

            {overview ? (
              <Panel>
                <Typography variant="overline" sx={{ color: "text.secondary" }}>
                  Recent signups
                </Typography>
                <Stack spacing={1.25} sx={{ mt: 1.5 }}>
                  {overview.recentOrganizations.slice(0, 5).map((org) => (
                    <Box key={org.id} sx={{ borderTop: "1px solid var(--gf-border)", pt: 1.25, "&:first-of-type": { borderTop: "none", pt: 0 } }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={1}>
                        <Typography sx={{ fontSize: 12.5, fontWeight: 600 }} noWrap>
                          {org.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "text.disabled", whiteSpace: "nowrap" }}>
                          {when(org.createdAt)}
                        </Typography>
                      </Stack>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        {PLAN_LABEL[org.plan]} · {org.staff} staff · {org.members} members
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Panel>
            ) : null}
          </Stack>
        </Box>
      ) : null}

      {tab === "users" ? (
        <Box>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 1.5 }}>
            <TextField
              size="small"
              placeholder="Search name or email"
              value={userSearch}
              onChange={(event) => setUserSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void loadUsers();
              }}
              sx={{ minWidth: 280, "& .MuiOutlinedInput-root": { backgroundColor: "background.paper" } }}
            />
            <Button variant="contained" size="small" onClick={() => void loadUsers()}>
              Search
            </Button>
          </Stack>
          {userError ? <Alert severity="error" sx={{ mb: 2 }}>{userError}</Alert> : null}
          {userActionError ? <Alert severity="error" sx={{ mb: 2 }}>{userActionError}</Alert> : null}
          {!users ? (
            <LoadingSkeleton rows={6} />
          ) : (
            <TableShell>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Person</TableCell>
                    <TableCell>Gym access</TableCell>
                    <TableCell>Account</TableCell>
                    <TableCell>Last seen</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((person) => (
                    <TableRow key={person.id} hover>
                      <TableCell>
                        <Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>{person.name}</Typography>
                        <Typography variant="caption" sx={{ color: "text.secondary" }}>
                          {person.email}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                          {person.memberships.length === 0 ? (
                            <Typography variant="caption" sx={{ color: "text.disabled" }}>
                              No gym brand
                            </Typography>
                          ) : (
                            person.memberships.map((membership) => (
                              <Chip
                                key={`${person.id}-${membership.organization.id}`}
                                size="small"
                                label={`${membership.organization.name} · ${membership.role
                                  .toLowerCase()
                                  .replace(/_/g, " ")}`}
                                sx={{ textTransform: "none", letterSpacing: 0, fontSize: 11 }}
                              />
                            ))
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} sx={{ flexWrap: "wrap", gap: 0.5 }}>
                          {person.isPlatformAdmin ? (
                            <Chip size="small" label="Platform admin" color="primary" sx={{ fontSize: 11 }} />
                          ) : (
                            <StatusChip status={person.emailVerified ? "ACTIVE" : "PENDING"} />
                          )}
                          {!person.isActive ? (
                            <Chip size="small" label="Disabled" color="error" sx={{ fontSize: 11 }} />
                          ) : null}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ color: "text.secondary", whiteSpace: "nowrap" }}>
                          {when(person.lastLoginAt)}
                        </Typography>
                        <Typography variant="caption" sx={{ display: "block", color: "text.disabled" }}>
                          joined {when(person.createdAt)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end" sx={{ flexWrap: "wrap", gap: 0.5 }}>
                          <Button
                            size="small"
                            disabled={busyUser === person.id}
                            startIcon={<KeyRound size={13} />}
                            onClick={() => void revokeSessions(person)}
                          >
                            Sign out
                          </Button>
                          <Button
                            size="small"
                            color={person.isActive ? "error" : "primary"}
                            disabled={busyUser === person.id}
                            onClick={() =>
                              void updatePerson(
                                person,
                                { isActive: !person.isActive },
                                person.isActive
                                  ? `Disable ${person.name}? They are signed out and cannot sign in until you re-enable the account. Their gym roles are kept.`
                                  : `Re-enable ${person.name}? They will be able to sign in again.`,
                              )
                            }
                          >
                            {person.isActive ? "Disable" : "Enable"}
                          </Button>
                          <Button
                            size="small"
                            disabled={busyUser === person.id}
                            startIcon={person.isPlatformAdmin ? <ShieldOff size={13} /> : <ShieldCheck size={13} />}
                            onClick={() =>
                              void updatePerson(
                                person,
                                { isPlatformAdmin: !person.isPlatformAdmin },
                                person.isPlatformAdmin
                                  ? `Remove platform access from ${person.name}? They keep their gym roles but lose the vendor console.`
                                  : `Give ${person.name} platform access? They will see every gym brand's commercial data.`,
                              )
                            }
                          >
                            {person.isPlatformAdmin ? "Revoke vendor" : "Make vendor"}
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <Typography variant="body2" sx={{ color: "text.secondary", py: 2 }}>
                          No people match this search.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </TableShell>
          )}
        </Box>
      ) : null}

      {tab === "log" ? (
        <Box>
          {logError ? <Alert severity="error" sx={{ mb: 2 }}>{logError}</Alert> : null}
          {!log ? (
            <LoadingSkeleton rows={6} />
          ) : (
            <>
              <TableShell>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>When</TableCell>
                      <TableCell>Operator</TableCell>
                      <TableCell>Action</TableCell>
                      <TableCell>Target</TableCell>
                      <TableCell>Detail</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {log.map((row) => (
                      <TableRow key={row.id} hover>
                        <TableCell>
                          <Typography variant="caption" sx={{ color: "text.secondary", whiteSpace: "nowrap" }}>
                            {new Date(row.createdAt).toLocaleString(undefined, {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ fontWeight: 600 }}>
                            {row.actor.name}
                          </Typography>
                          <Typography variant="caption" sx={{ display: "block", color: "text.disabled" }}>
                            {row.actor.email}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">{row.action.replace(/[._]/g, " ")}</Typography>
                          <Typography variant="caption" sx={{ display: "block", color: "text.disabled" }}>
                            {row.ip ?? "no ip"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">{row.organization?.name ?? "Platform"}</Typography>
                          {row.targetUser ? (
                            <Typography variant="caption" sx={{ display: "block", color: "text.disabled" }}>
                              {row.targetUser.name} · {row.targetUser.email}
                            </Typography>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="caption"
                            sx={{
                              display: "block",
                              maxWidth: 320,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              color: "text.disabled",
                            }}
                          >
                            {row.metadata ? JSON.stringify(row.metadata) : "—"}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                    {log.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5}>
                          <Typography variant="body2" sx={{ color: "text.secondary", py: 2 }}>
                            No platform operations recorded yet.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </TableShell>
              <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end" sx={{ mt: 1.5 }}>
                <Button size="small" disabled={logPage <= 1} onClick={() => void loadLog(logPage - 1)}>
                  Newer
                </Button>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  Page {logPage} of {logPages}
                </Typography>
                <Button size="small" disabled={logPage >= logPages} onClick={() => void loadLog(logPage + 1)}>
                  Older
                </Button>
              </Stack>
            </>
          )}
        </Box>
      ) : null}

      {tab === "activity" ? (
        <Box>
          {activityError ? <Alert severity="error" sx={{ mb: 2 }}>{activityError}</Alert> : null}
          {!activity ? (
            <LoadingSkeleton rows={6} />
          ) : (
            <TableShell>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>When</TableCell>
                    <TableCell>Gym brand</TableCell>
                    <TableCell>Action</TableCell>
                    <TableCell>Actor</TableCell>
                    <TableCell>IP</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {activity.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell>
                        <Typography variant="caption" sx={{ color: "text.secondary", whiteSpace: "nowrap" }}>
                          {new Date(row.createdAt).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>
                          {row.organization.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">{row.action.replace(/[._]/g, " ")}</Typography>
                        <Typography variant="caption" sx={{ display: "block", color: "text.disabled" }}>
                          {row.entityType}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">{row.user?.name ?? "System"}</Typography>
                        <Typography variant="caption" sx={{ display: "block", color: "text.disabled" }}>
                          {row.user?.email ?? ""}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ color: "text.disabled" }}>
                          {row.ip ?? "—"}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableShell>
          )}
        </Box>
      ) : null}

      <Modal open={!!selected} title={detail?.organization.name ?? "Gym brand"} onClose={closeOrg} maxWidth="md">
        {detailError ? <Alert severity="error">{detailError}</Alert> : null}
        {!detail && !detailError ? <CircularProgress size={22} sx={{ my: 2 }} /> : null}
        {detail ? (
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2, flexWrap: "wrap" }}>
              <StatusChip status={detail.organization.status} />
              <Chip
                size="small"
                label={`${PLAN_LABEL[detail.organization.plan] ?? detail.organization.plan} · ${
                  detail.subscription?.status ?? "TRIAL"
                }`}
                sx={{ textTransform: "none", letterSpacing: 0 }}
              />
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {detail.organization.slug} · {detail.organization.currency} · {detail.organization.timezone}
              </Typography>
              {detail.subscription?.trialEndsAt ? (
                <Chip
                  size="small"
                  variant="outlined"
                  label={`Trial ${trialLabel(detail.subscription.trialEndsAt)}`}
                  sx={{ textTransform: "none", letterSpacing: 0 }}
                />
              ) : null}
            </Stack>

            <Box
              sx={{
                display: "grid",
                gap: 1.25,
                gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(5, 1fr)" },
                mb: 2.5,
              }}
            >
              {[
                { label: "Members", value: detail.usage.members },
                { label: "Prospects", value: detail.usage.prospects },
                { label: "Staff", value: detail.usage.staff },
                { label: "Clubs", value: detail.usage.locations },
                { label: "Pending invites", value: detail.usage.pendingInvitations },
              ].map((metric) => (
                <Box key={metric.label} sx={{ p: 1.25, borderRadius: 2, backgroundColor: "action.hover" }}>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {metric.label}
                  </Typography>
                  <Typography sx={{ fontSize: 17, fontWeight: 700 }}>{metric.value}</Typography>
                </Box>
              ))}
            </Box>

            <Box
              sx={{
                display: "grid",
                gap: 1.5,
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                mb: 2.5,
              }}
            >
              <Box sx={{ p: 1.5, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <CalendarClock size={15} />
                  <Typography sx={{ fontSize: 13, fontWeight: 700 }}>Trial</Typography>
                </Stack>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {detail.subscription?.trialEndsAt
                    ? `Ends ${new Date(detail.subscription.trialEndsAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}.`
                    : "No trial end date on the current subscription."}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.25 }}>
                  <TextField
                    size="small"
                    type="number"
                    label="Days"
                    value={trialDays}
                    onChange={(event) =>
                      setTrialDays(Math.min(Math.max(Number(event.target.value) || 1, 1), 90))
                    }
                    sx={{ width: 90 }}
                  />
                  <Button variant="outlined" size="small" disabled={saving} onClick={() => void extendTrial(trialDays)}>
                    Extend trial
                  </Button>
                </Stack>
                <Stack direction="row" spacing={0.75} sx={{ mt: 1 }}>
                  {[7, 14, 30].map((days) => (
                    <Button key={days} size="small" disabled={saving} onClick={() => void extendTrial(days)}>
                      +{days}d
                    </Button>
                  ))}
                </Stack>
              </Box>

              <Box sx={{ p: 1.5, borderRadius: 2, border: "1px solid var(--gf-accent-border)", backgroundColor: "var(--gf-accent-soft)" }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <Eye size={15} />
                  <Typography sx={{ fontSize: 13, fontWeight: 700 }}>Support access</Typography>
                </Stack>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  Open the gym&apos;s workspace read-only. Writes are blocked, the owner sees the support access
                  in their audit log, and you must give a reason.
                </Typography>
                <Button
                  variant="contained"
                  size="small"
                  disabled={saving || detail.organization.status !== "active"}
                  startIcon={<Eye size={14} />}
                  onClick={() => void viewAsGym()}
                  sx={{ mt: 1.25 }}
                >
                  View as gym (read-only)
                </Button>
                {detail.organization.status !== "active" ? (
                  <Typography variant="caption" sx={{ display: "block", mt: 0.75, color: "text.disabled" }}>
                    Reactivate the brand before opening a support view.
                  </Typography>
                ) : null}
              </Box>
            </Box>

            <Typography variant="overline" sx={{ color: "text.secondary" }}>
              Commercial controls
            </Typography>
            <Box
              sx={{
                display: "grid",
                gap: 1.5,
                gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
                mt: 1,
                mb: 1.5,
              }}
            >
              <TextField
                select
                size="small"
                label="Brand status"
                value={form.status}
                onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="suspended">Suspended</MenuItem>
              </TextField>
              <TextField
                select
                size="small"
                label="Plan"
                value={form.plan}
                onChange={(event) => setForm((current) => ({ ...current, plan: event.target.value }))}
              >
                {["STARTER", "GROWTH", "SCALE"].map((plan) => (
                  <MenuItem key={plan} value={plan}>
                    {PLAN_LABEL[plan]}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                size="small"
                label="Subscription"
                value={form.subscriptionStatus}
                onChange={(event) => setForm((current) => ({ ...current, subscriptionStatus: event.target.value }))}
              >
                {SUB_STATUSES.map((value) => (
                  <MenuItem key={value} value={value}>
                    {value.replace("_", " ")}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                size="small"
                type="number"
                label="Staff seats"
                value={form.quotaStaff}
                onChange={(event) => setForm((current) => ({ ...current, quotaStaff: Number(event.target.value) }))}
              />
              <TextField
                size="small"
                type="number"
                label="Member cap"
                value={form.quotaMembers}
                onChange={(event) => setForm((current) => ({ ...current, quotaMembers: Number(event.target.value) }))}
              />
              <Typography variant="caption" sx={{ color: "text.secondary", alignSelf: "center" }}>
                Suspending blocks every tenant request with <code>org_suspended</code>. Records are kept.
              </Typography>
            </Box>

            {saveError ? <Alert severity="error" sx={{ mb: 1.5 }}>{saveError}</Alert> : null}

            <Typography variant="overline" sx={{ color: "text.secondary" }}>
              Staff roster
            </Typography>
            <Stack spacing={1} sx={{ mt: 1, maxHeight: 220, overflowY: "auto" }}>
              {detail.staff.map((person) => (
                <Stack key={person.id} direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 600 }} noWrap>
                      {person.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      {person.email}
                    </Typography>
                  </Box>
                  <Chip size="small" label={person.role.toLowerCase().replace(/_/g, " ")} sx={{ textTransform: "none", letterSpacing: 0, fontSize: 11 }} />
                </Stack>
              ))}
              {detail.staff.length === 0 ? (
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  No staff yet.
                </Typography>
              ) : null}
            </Stack>

            <Typography variant="overline" sx={{ color: "text.secondary", display: "block", mt: 2.5 }}>
              Latest audit events
            </Typography>
            <Stack spacing={0.75} sx={{ mt: 1 }}>
              {detail.recentActivity.slice(0, 6).map((event) => (
                <Stack key={event.id} direction="row" justifyContent="space-between" spacing={1}>
                  <Typography variant="caption">{event.action.replace(/[._]/g, " ")}</Typography>
                  <Typography variant="caption" sx={{ color: "text.disabled", whiteSpace: "nowrap" }}>
                    {when(event.createdAt)}
                  </Typography>
                </Stack>
              ))}
              {detail.recentActivity.length === 0 ? (
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  No tenant activity recorded yet.
                </Typography>
              ) : null}
            </Stack>

            <DialogActions sx={{ px: 0, pb: 0, mt: 2.5 }}>
              <Button onClick={closeOrg} disabled={saving}>
                Close
              </Button>
              <Button variant="contained" onClick={() => void saveOrg()} disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </DialogActions>
          </Box>
        ) : null}
      </Modal>
    </Box>
  );
}
