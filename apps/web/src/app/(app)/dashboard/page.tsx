"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { StatCard, LoadingSkeleton, ErrorState } from "@/components/ui";
import { Users, UserRound, KanbanSquare, TicketCheck, CircleDollarSign, BadgeDollarSign } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface DashboardStats {
  totalLeads: number;
  totalContacts: number;
  totalDeals: number;
  totalTickets: number;
  wonRevenue: number;
  openTickets: number;
}
interface SalesMonth { month: string; value: number }

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [sales, setSales] = useState<SalesMonth[]>([]);
  const [error, setError] = useState("");

  const load = async () => {
    setError("");
    try {
      const [dash, monthly] = await Promise.all([
        api<DashboardStats>("/reports/dashboard"),
        api<SalesMonth[]>("/reports/sales-by-month"),
      ]);
      setStats(dash);
      setSales(monthly);
    } catch (err: any) {
      setError(err?.message || "Failed to load dashboard");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!stats) return <LoadingSkeleton rows={4} />;

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink-900">Dashboard</h1>
          <p className="text-xs text-slate-500">Workspace performance at a glance</p>
        </div>
        <button className="btn-secondary" onClick={() => void load()}>Refresh</button>
      </div>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Total leads" value={stats.totalLeads} icon={UserRound} />
        <StatCard label="Contacts" value={stats.totalContacts} icon={Users} />
        <StatCard label="Active deals" value={stats.totalDeals} icon={KanbanSquare} />
        <StatCard label="Open tickets" value={stats.openTickets} icon={TicketCheck} sub={`${stats.totalTickets} total`} />
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="card p-5">
          <div className="flex items-center gap-2">
            <CircleDollarSign size={18} className="text-accent-600" />
            <p className="label !mb-0">Won revenue</p>
          </div>
          <p className="mt-2 text-3xl font-black text-ink-900">${stats.wonRevenue.toLocaleString()}</p>
          <p className="mt-1 text-xs text-slate-500">All-time closed won deals</p>
        </div>
        <div className="card col-span-1 p-5 xl:col-span-2">
          <p className="label">Sales by month</p>
          {sales.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-slate-400">No closed-won revenue recorded yet</div>
          ) : (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sales}>
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
    </div>
  );
}
