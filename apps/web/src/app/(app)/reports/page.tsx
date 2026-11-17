"use client";
import { useEffect, useState } from "react";
import { api, getAccessToken } from "@/lib/api";
import { LoadingSkeleton, ErrorState } from "@/components/ui";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend, LineChart, Line } from "recharts";
import { Download } from "lucide-react";

const SOURCE_COLORS = ["#4f46e5", "#6366f1", "#818cf8", "#a5b4fc", "#c7d2fe", "#7c3aed", "#0891b2", "#059669", "#d97706"];

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
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink-900">Club reports</h1>
          <p className="text-xs text-slate-500">Joins, attendance and retention across every club</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {EXPORTS.map((entry) => (
            <button key={entry.key} className="btn-secondary" onClick={() => void exportCsv(entry.key)}>
              <Download size={14} /> {entry.label} CSV
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card p-5">
          <p className="label">Prospects</p>
          <p className="mt-1 text-3xl font-black text-ink-900">{conversion.total}</p>
          <p className="mt-1 text-xs text-slate-500">{conversion.converted} joined</p>
        </div>
        <div className="card p-5">
          <p className="label">Trial conversion</p>
          <p className="mt-1 text-3xl font-black text-accent-700">{conversion.rate.toFixed(1)}%</p>
          <p className="mt-1 text-xs text-slate-500">Joined ÷ all prospects</p>
        </div>
        <div className="card p-5">
          <p className="label">Active members</p>
          <p className="mt-1 text-3xl font-black text-emerald-600">{retention.active}</p>
          <p className="mt-1 text-xs text-slate-500">{retention.trial} on trial · {retention.paused} paused</p>
        </div>
        <div className="card p-5">
          <p className="label">Churn rate</p>
          <p className="mt-1 text-3xl font-black text-rose-600">{retention.churnRate.toFixed(1)}%</p>
          <p className="mt-1 text-xs text-slate-500">{retention.cancelled} cancelled · {retention.expired} expired</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="card p-5">
          <p className="label">Signed contract value by month</p>
          {joins.length === 0 ? (
            <p className="flex h-56 items-center justify-center text-sm text-slate-400">No signed memberships recorded yet</p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={joins}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: "rgba(99,102,241,0.08)" }} />
                  <Bar dataKey="value" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        <div className="card p-5">
          <p className="label">Prospects by source</p>
          {sources.length === 0 ? (
            <p className="flex h-56 items-center justify-center text-sm text-slate-400">No prospects yet</p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sources} dataKey="count" nameKey="source" innerRadius={50} outerRadius={78} paddingAngle={2}>
                    {sources.map((s, i) => (<Cell key={s.source} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="card p-5">
        <p className="label">Check-ins · last 30 days</p>
        {checkIns.length === 0 ? (
          <p className="flex h-52 items-center justify-center text-sm text-slate-400">No check-ins recorded yet</p>
        ) : (
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={checkIns}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#4f46e5" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="card p-5">
        <p className="label">Membership revenue by advisor</p>
        {staff.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-400">No active memberships assigned yet</p>
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50"><tr><th className="th">Advisor</th><th className="th">Active contracts</th><th className="th">MRR</th><th className="th">Contract value</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {staff.sort((a, b) => b.row.mrr - a.row.mrr).map(({ row, name }) => (
                  <tr key={row.ownerId}>
                    <td className="td text-sm font-medium text-slate-800">{name}</td>
                    <td className="td text-xs">{row.count}</td>
                    <td className="td text-xs font-bold text-accent-700">${row.mrr.toLocaleString()}</td>
                    <td className="td text-xs">${row.contractValue.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
