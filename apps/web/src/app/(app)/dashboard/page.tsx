"use client";
import { useEffect, useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import { Stack } from "@/components/mui-stack";
import { api } from "@/lib/api";
import { ErrorState, LoadingSkeleton, PageHeader, Panel, StatCard } from "@/components/kit";
import { CircleDollarSign, Dumbbell, QrCode, TicketCheck, UserPlus, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface DashboardStats {
  totalProspects: number;
  totalMembers: number;
  activeMembers: number;
  trialMembers: number;
  totalMemberships: number;
  totalTickets: number;
  openTickets: number;
  checkInsToday: number;
  mrr: number;
}
interface JoinMonth { month: string; value: number; count: number }
interface CheckInDay { date: string; count: number }

const AXIS = { fontSize: 11, fill: "#8d8d95" };
const GRID = "rgba(255,255,255,0.07)";
const TOOLTIP_STYLE = {
  backgroundColor: "#151519",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 10,
  fontSize: 12,
  color: "#f5f5f6",
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [joins, setJoins] = useState<JoinMonth[]>([]);
  const [checkIns, setCheckIns] = useState<CheckInDay[]>([]);
  const [error, setError] = useState("");

  const load = async () => {
    setError("");
    try {
      const [dash, monthly, daily] = await Promise.all([
        api<DashboardStats>("/reports/dashboard"),
        api<JoinMonth[]>("/reports/joins-by-month"),
        api<CheckInDay[]>("/reports/checkins-by-day?days=14"),
      ]);
      setStats(dash);
      setJoins(monthly);
      setCheckIns(daily);
    } catch (err: any) {
      setError(err?.message || "Failed to load dashboard");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!stats) return <LoadingSkeleton rows={4} />;

  const monthlyRecurring = stats.mrr.toLocaleString(undefined, { maximumFractionDigits: 0 });

  return (
    <Box>
      <PageHeader
        title="Club dashboard"
        subtitle="Membership, attendance and retention at a glance"
        actions={
          <Button variant="outlined" size="small" onClick={() => void load()}>
            Refresh
          </Button>
        }
      />

      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "repeat(4, 1fr)" } }}>
        <StatCard label="Active members" value={stats.activeMembers} icon={Users} sub={`${stats.totalMembers} total · ${stats.trialMembers} on trial`} />
        <StatCard label="Recurring revenue" value={`$${monthlyRecurring}`} icon={CircleDollarSign} sub={`${stats.totalMemberships} contracts`} />
        <StatCard label="Check-ins today" value={stats.checkInsToday} icon={QrCode} sub="Front desk, app and QR" />
        <StatCard label="Open support" value={stats.openTickets} icon={TicketCheck} sub={`${stats.totalTickets} tickets total`} />
      </Box>

      <Box
        sx={{
          display: "grid",
          gap: 2,
          mt: 2,
          gridTemplateColumns: { xs: "1fr", lg: "minmax(280px, 1fr) 2fr" },
        }}
      >
        <Panel>
          <Stack direction="row" spacing={1} alignItems="center">
            <UserPlus size={16} color="#8d8d95" />
            <Typography variant="overline" sx={{ color: "text.secondary" }}>
              Prospects in play
            </Typography>
          </Stack>
          <Typography sx={{ mt: 1.5, fontSize: 36, fontWeight: 700, letterSpacing: "-0.035em", lineHeight: 1 }}>
            {stats.totalProspects}
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 1 }}>
            Enquiries, tours and trials in the funnel
          </Typography>
          <Stack spacing={1.25} sx={{ mt: 2.5, pt: 2, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
            {[
              ["Active", stats.activeMembers],
              ["On trial", stats.trialMembers],
              ["Contracts", stats.totalMemberships],
            ].map(([label, value]) => (
              <Stack key={String(label)} direction="row" justifyContent="space-between">
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  {label}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 650 }}>
                  {value}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Panel>

        <Panel>
          <Typography variant="overline" sx={{ color: "text.secondary" }}>
            Signed contract value by month
          </Typography>
          {joins.length === 0 ? (
            <Box sx={{ height: 200, display: "grid", placeItems: "center" }}>
              <Typography variant="body2" sx={{ color: "text.disabled" }}>
                No signed memberships recorded yet
              </Typography>
            </Box>
          ) : (
            <Box sx={{ height: 200, mt: 1 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={joins}>
                  <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={AXIS} axisLine={false} tickLine={false} />
                  <YAxis tick={AXIS} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: "rgba(255,255,255,0.05)" }} contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="value" fill="#e4e4e7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          )}
        </Panel>
      </Box>

      <Panel sx={{ mt: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Dumbbell size={16} color="#8d8d95" />
          <Typography variant="overline" sx={{ color: "text.secondary" }}>
            Check-ins · last 14 days
          </Typography>
        </Stack>
        {checkIns.length === 0 ? (
          <Box sx={{ height: 170, display: "grid", placeItems: "center" }}>
            <Typography variant="body2" sx={{ color: "text.disabled" }}>
              No check-ins recorded yet
            </Typography>
          </Box>
        ) : (
          <Box sx={{ height: 170, mt: 1 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={checkIns}>
                <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={AXIS} axisLine={false} tickLine={false} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis tick={AXIS} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Line type="monotone" dataKey="count" stroke="#f5f5f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        )}
      </Panel>
    </Box>
  );
}
