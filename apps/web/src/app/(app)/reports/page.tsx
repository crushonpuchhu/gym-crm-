"use client";
import { useEffect, useState } from "react";
import { Box, Button, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { api, getAccessToken } from "@/lib/api";
import { ErrorState, LoadingSkeleton, PageHeader, Panel, StatCard, TableShell } from "@/components/kit";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download } from "lucide-react";

const SOURCE_COLORS = ["#f5f5f6", "#c9c9cf", "#9a9aa2", "#74747c", "#55555c", "#3d3d43", "#2c2c32", "#232328", "#1a1a1e"];

const AXIS = { fontSize: 11, fill: "#8d8d95" };
const GRID = "rgba(255,255,255,0.07)";
const TOOLTIP_STYLE = {
  backgroundColor: "#151519",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 10,
  fontSize: 12,
  color: "#f5f5f6",
};

interface Conversion { total: number; converted: number; rate: number }
interface ProspectBySource { source: string; count: number }
interface JoinMonth { month: string; value: number; count: number }
interface CheckInDay { date: string; count: number }
interface Retention { active: number; paused: number; cancelled: number; trial: number; expired: number; churnRate: number }
interface StaffRow { ownerId: string; mrr: number; contractValue: number; count: number }
interface StaffMember { id: string; name: string }

const EXPORTS: { key: string; label: string }[] = [
  { key: "prospects", label: "Prospects" },
  { key: "memberships", label: "Memberships" },
  { key: "members", label: "Members" },
  { key: "tickets", label: "Tickets" },
  { key: "checkins", label: "Check-ins" },
];

export default function ReportsPage() {
  const [conversion, setConversion] = useState<Conversion | null>(null);
  const [sources, setSources] = useState<ProspectBySource[]>([]);
  const [joins, setJoins] = useState<JoinMonth[]>([]);
  const [checkIns, setCheckIns] = useState<CheckInDay[]>([]);
  const [retention, setRetention] = useState<Retention | null>(null);
  const [staff, setStaff] = useState<{ row: StaffRow; name: string }[]>([]);
  const [error, setError] = useState("");

  const load = () => {
    setError("");
    Promise.all([
      api<Conversion>("/reports/conversion"),
      api<ProspectBySource[]>("/reports/prospects-by-source"),
      api<JoinMonth[]>("/reports/joins-by-month"),
      api<CheckInDay[]>("/reports/checkins-by-day?days=30"),
      api<Retention>("/reports/retention"),
      api<StaffMember[] | { items: StaffMember[] }>("/users").catch(() => [] as StaffMember[]),
    ])
      .then(([c, s, j, ci, r, users]) => {
        const staffList = Array.isArray(users) ? users : users.items ?? [];
        setConversion(c);
        setSources(s);
        setJoins(j);
        setCheckIns(ci);
        setRetention(r);
        void api<StaffRow[]>("/reports/staff-performance")
          .then((rows) => setStaff(rows.map((row) => ({ row, name: staffList.find((u) => u.id === row.ownerId)?.name || "Unassigned" }))))
          .catch(() => setStaff([]));
      })
      .catch((err: any) => setError(err?.message || "Failed to load reports"));
  };

  useEffect(() => {
    load();
  }, []);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!conversion || !retention) return <LoadingSkeleton rows={4} />;

  /** Exports need the bearer token, so fetch the file and save the blob locally. */
  const exportCsv = async (name: string) => {
    try {
      const token = getAccessToken();
      const response = await fetch(`/api/v1/reports/export/${name}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      if (!response.ok) throw new Error(`Export failed (${response.status})`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${name}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err?.message || "Export failed");
    }
  };

  return (
    <Box>
      <PageHeader
        title="Club reports"
        subtitle="Joins, attendance and retention across every club"
        actions={EXPORTS.map((entry) => (
          <Button key={entry.key} variant="outlined" size="small" startIcon={<Download size={14} />} onClick={() => void exportCsv(entry.key)}>
            {entry.label} CSV
          </Button>
        ))}
      />

      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "repeat(4, 1fr)" } }}>
        <StatCard label="Prospects" value={conversion.total} sub={`${conversion.converted} joined`} />
        <StatCard label="Trial conversion" value={`${conversion.rate.toFixed(1)}%`} sub="Joined ÷ all prospects" />
        <StatCard label="Active members" value={retention.active} sub={`${retention.trial} on trial · ${retention.paused} paused`} />
        <StatCard label="Churn rate" value={`${retention.churnRate.toFixed(1)}%`} sub={`${retention.cancelled} cancelled · ${retention.expired} expired`} />
      </Box>

      <Box sx={{ display: "grid", gap: 2, mt: 2, gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" } }}>
        <Panel>
          <Typography variant="overline" sx={{ color: "text.secondary" }}>
            Signed contract value by month
          </Typography>
          {joins.length === 0 ? (
            <Box sx={{ height: 220, display: "grid", placeItems: "center" }}>
              <Typography variant="body2" sx={{ color: "text.disabled" }}>
                No signed memberships recorded yet
              </Typography>
            </Box>
          ) : (
            <Box sx={{ height: 220, mt: 1 }}>
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

        <Panel>
          <Typography variant="overline" sx={{ color: "text.secondary" }}>
            Prospects by source
          </Typography>
          {sources.length === 0 ? (
            <Box sx={{ height: 220, display: "grid", placeItems: "center" }}>
              <Typography variant="body2" sx={{ color: "text.disabled" }}>
                No prospects yet
              </Typography>
            </Box>
          ) : (
            <Box sx={{ height: 220, mt: 1 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sources} dataKey="count" nameKey="source" innerRadius={50} outerRadius={78} paddingAngle={2} stroke="#111114">
                    {sources.map((s, i) => (
                      <Cell key={s.source} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend formatter={(value) => <span style={{ color: "#94949c", fontSize: 11 }}>{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          )}
        </Panel>
      </Box>

      <Panel sx={{ mt: 2 }}>
        <Typography variant="overline" sx={{ color: "text.secondary" }}>
          Check-ins · last 30 days
        </Typography>
        {checkIns.length === 0 ? (
          <Box sx={{ height: 200, display: "grid", placeItems: "center" }}>
            <Typography variant="body2" sx={{ color: "text.disabled" }}>
              No check-ins recorded yet
            </Typography>
          </Box>
        ) : (
          <Box sx={{ height: 200, mt: 1 }}>
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

      <Panel sx={{ mt: 2 }}>
        <Typography variant="overline" sx={{ color: "text.secondary" }}>
          Membership revenue by advisor
        </Typography>
        {staff.length === 0 ? (
          <Typography variant="body2" sx={{ py: 4, textAlign: "center", color: "text.disabled" }}>
            No active memberships assigned yet
          </Typography>
        ) : (
          <Box sx={{ mt: 1 }}>
            <TableShell>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Advisor</TableCell>
                    <TableCell>Active contracts</TableCell>
                    <TableCell>MRR</TableCell>
                    <TableCell>Contract value</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {staff
                    .slice()
                    .sort((a, b) => b.row.mrr - a.row.mrr)
                    .map(({ row, name }) => (
                      <TableRow key={row.ownerId} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ color: "text.secondary" }}>
                            {row.count}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 650 }}>
                            ${row.mrr.toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ color: "text.secondary" }}>
                            ${row.contractValue.toLocaleString()}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableShell>
          </Box>
        )}
      </Panel>
    </Box>
  );
}
