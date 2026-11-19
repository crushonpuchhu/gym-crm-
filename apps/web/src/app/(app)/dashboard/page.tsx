"use client";
import { useEffect, useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import { Stack } from "@/components/mui-stack";
import { api } from "@/lib/api";
import { ErrorState, LoadingSkeleton, PageHeader, Panel, StatCard } from "@/components/kit";
import { CircleDollarSign, Dumbbell, QrCode, TicketCheck, UserPlus, Users } from "lucide-react";
import { Area, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART, TONES, type ToneName } from "@/palette";

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

const FUNNEL: { label: string; key: keyof DashboardStats; tone: ToneName }[] = [
  { label: "Active", key: "activeMembers", tone: "emerald" },
  { label: "On trial", key: "trialMembers", tone: "amber" },
  { label: "Contracts", key: "totalMemberships", tone: "violet" },
];

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
        <StatCard label="Active members" value={stats.activeMembers} icon={Users} tone="indigo" sub={`${stats.totalMembers} total · ${stats.trialMembers} on trial`} />
        <StatCard label="Recurring revenue" value={`$${monthlyRecurring}`} icon={CircleDollarSign} tone="emerald" sub={`${stats.totalMemberships} contracts`} />
        <StatCard label="Check-ins today" value={stats.checkInsToday} icon={QrCode} tone="cyan" sub="Front desk, app and QR" />
        <StatCard label="Open support" value={stats.openTickets} icon={TicketCheck} tone="amber" sub={`${stats.totalTickets} tickets total`} />
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
            <UserPlus size={16} color={TONES.indigo.main} />
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
            {FUNNEL.map((row) => (
              <Stack key={row.label} direction="row" justifyContent="space-between" alignItems="center">
                <Stack direction="row" spacing={0.9} alignItems="center">
                  <Box
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      backgroundColor: TONES[row.tone].main,
                      boxShadow: `0 0 0 3px ${TONES[row.tone].soft}`,
                    }}
                  />
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    {row.label}
                  </Typography>
                </Stack>
                <Typography variant="body2" sx={{ fontWeight: 650 }}>
                  {stats[row.key]}
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
                  <defs>
                    <linearGradient id="monthBars" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#9aa6ff" />
                      <stop offset="100%" stopColor="#6370e0" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={CHART.axis} axisLine={false} tickLine={false} />
                  <YAxis tick={CHART.axis} axisLine={false} tickLine={false} />
                  <Tooltip cursor={CHART.cursor} contentStyle={CHART.tooltip} />
                  <Bar dataKey="value" fill="url(#monthBars)" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          )}
        </Panel>
      </Box>

      <Panel sx={{ mt: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Dumbbell size={16} color={TONES.cyan.main} />
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
                <defs>
                  <linearGradient id="checkInStroke" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={TONES.indigo.main} />
                    <stop offset="100%" stopColor={TONES.cyan.main} />
                  </linearGradient>
                  <linearGradient id="checkInFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={TONES.indigo.main} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={TONES.indigo.main} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={CHART.axis} axisLine={false} tickLine={false} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis tick={CHART.axis} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={CHART.tooltip} cursor={{ stroke: "rgba(255,255,255,0.15)" }} />
                <Area type="monotone" dataKey="count" stroke="none" fill="url(#checkInFill)" />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="url(#checkInStroke)"
                  strokeWidth={2.4}
                  dot={false}
                  activeDot={{ r: 4, fill: TONES.cyan.main, stroke: "#111114", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        )}
      </Panel>
    </Box>
  );
}
