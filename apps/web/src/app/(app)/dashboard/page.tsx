"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { StatCard, LoadingSkeleton, ErrorState } from "@/components/ui";
import { Users, UserPlus, TicketCheck, QrCode, CircleDollarSign, Dumbbell } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from "recharts";

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
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink-900">Club dashboard</h1>
          <p className="text-xs text-slate-500">Membership, attendance and retention at a glance</p>
        </div>
        <button className="btn-secondary" onClick={() => void load()}>Refresh</button>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Active members" value={stats.activeMembers} icon={Users} sub={`${stats.totalMembers} total · ${stats.trialMembers} on trial`} />
        <StatCard label="Monthly recurring revenue" value={`$${monthlyRecurring}`} icon={CircleDollarSign} sub={`${stats.totalMemberships} contracts`} />
        <StatCard label="Check-ins today" value={stats.checkInsToday} icon={QrCode} sub="Front desk, app and QR" />
        <StatCard label="Open support" value={stats.openTickets} icon={TicketCheck} sub={`${stats.totalTickets} tickets total`} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="card p-5">
          <div className="flex items-center gap-2">
            <UserPlus size={18} className="text-accent-600" />
            <p className="label !mb-0">Prospects in play</p>
          </div>
          <p className="mt-2 text-3xl font-black text-ink-900">{stats.totalProspects}</p>
          <p className="mt-1 text-xs text-slate-500">Enquiries, tours and trials in the funnel</p>
          <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
            <p className="flex items-center justify-between"><span>Active</span><span className="font-bold text-slate-800">{stats.activeMembers}</span></p>
            <p className="flex items-center justify-between"><span>On trial</span><span className="font-bold text-slate-800">{stats.trialMembers}</span></p>
            <p className="flex items-center justify-between"><span>Contracts</span><span className="font-bold text-slate-800">{stats.totalMemberships}</span></p>
          </div>
        </div>
        <div className="card col-span-1 p-5 xl:col-span-2">
          <p className="label">Signed contract value by month</p>
          {joins.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-slate-400">No signed memberships recorded yet</div>
          ) : (
            <div className="h-48">
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
      </div>

      <div className="card p-5">
        <div className="flex items-center gap-2">
          <Dumbbell size={18} className="text-accent-600" />
          <p className="label !mb-0">Check-ins · last 14 days</p>
        </div>
        {checkIns.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-slate-400">No check-ins recorded yet</div>
        ) : (
          <div className="mt-2 h-40">
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
    </div>
  );
}
