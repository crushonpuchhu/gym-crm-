"use client";

import { useCallback, useEffect, useState } from "react";
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
import { ErrorState, LoadingSkeleton, Modal, PageHeader, Panel, StatCard, StatusChip, TableShell } from "@/components/kit";
import { Activity, Building2, CreditCard, Search, ShieldCheck, Users } from "lucide-react";
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

const PLAN_LABEL: Record<string, string> = { STARTER: "Starter", GROWTH: "Growth", SCALE: "Scale" };
const SUB_STATUSES = ["TRIAL", "ACTIVE", "PAST_DUE", "CANCELLED", "EXPIRED"];
const TABS = [
  { key: "gyms", label: "Gyms" },
  { key: "users", label: "People" },
  { key: "activity", label: "Activity" },
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

function planTone(plan: string) {
  if (plan === "SCALE") return TONES.violet.main;
  if (plan === "GROWTH") return TONES.indigo.main;
  return TONES.cyan.main;
}

export default function PlatformPage() {
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

  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<OrgDetail | null>(null);
  const [detailError, setDetailError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
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

  useEffect(() => {
    void loadOverview();
    void loadGyms();
  }, [loadOverview, loadGyms]);

  useEffect(() => {
    if (tab === "users" && !users) void loadUsers();
    if (tab === "activity" && !activity) void loadActivity();
  }, [tab, users, activity, loadUsers, loadActivity]);

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
          <Button variant="outlined" size="small" startIcon={<Activity size={15} />} onClick={() => void loadOverview()}>
            Refresh
          </Button>
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
                        <TableCell colSpan={7}>
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
                    <TableCell>Joined</TableCell>
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
                        {person.isPlatformAdmin ? (
                          <Chip size="small" label="Platform admin" color="primary" sx={{ fontSize: 11 }} />
                        ) : (
                          <StatusChip status={person.emailVerified ? "ACTIVE" : "PENDING"} />
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ color: "text.secondary" }}>
                          {when(person.createdAt)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4}>
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
