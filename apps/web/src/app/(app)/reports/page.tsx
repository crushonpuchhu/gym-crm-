"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { LoadingSkeleton, ErrorState, StatusBadge } from "@/components/ui";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";
import { Download } from "lucide-react";

const SOURCE_COLORS = ["#4f46e5", "#818cf8", "#a5b4fc", "#c7d2fe", "#e0e7ff", "#6366f1"];

interface Conversion { total: number; converted: number; rate: number }
interface LeadsBySource { source: string; count: number }
interface SalesMonth { month: string; value: number }

export default function ReportsPage() {
  const [conversion, setConversion] = useState<Conversion | null>(null);
  const [sources, setSources] = useState<LeadsBySource[]>([]);
  const [sales, setSales] = useState<SalesMonth[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api<Conversion>("/reports/conversion"), api<LeadsBySource[]>("/reports/leads-by-source"), api<SalesMonth[]>("/reports/sales-by-month")])
      .then(([c, s, m]) => {
        setConversion(c);
        setSources(s);
        setSales(m);
      })
      .catch((err: any) => setError(err?.message || "Failed to load reports"));
  }, []);

  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  if (!conversion) return <LoadingSkeleton rows={4} />;

  const exportCsv = (name: string) => {
    window.open(`/api/v1/reports/export/${name}`, "_blank");
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink-900">Analytics & reports</h1>
          <p className="text-xs text-slate-500">Live data from this workspace</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => exportCsv("leads")}><Download size={14} /> Leads CSV</button>
          <button className="btn-secondary" onClick={() => exportCsv("deals")}><Download size={14} /> Deals CSV</button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <p className="label">Leads in pipeline</p>
          <p className="mt-1 text-3xl font-black text-ink-900">{conversion.total}</p>
        </div>
        <div className="card p-5">
          <p className="label">Converted</p>
          <p className="mt-1 text-3xl font-black text-emerald-600">{conversion.converted}</p>
        </div>
        <div className="card p-5">
          <p className="label">Conversion rate</p>
          <p className="mt-1 text-3xl font-black text-accent-700">{conversion.rate.toFixed(1)}%</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="card p-5">
          <p className="label">Sales by month</p>
          {sales.length === 0 ? (
            <p className="flex h-48 items-center justify-center text-sm text-slate-400">No closed-won data yet</p>
          ) : (
            <div className="h-56">
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
        <div className="card p-5">
          <p className="label">Leads by source</p>
          {sources.length === 0 ? (
            <p className="flex h-48 items-center justify-center text-sm text-slate-400">No leads yet</p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sources} dataKey="count" nameKey="source" innerRadius={55} outerRadius={80} paddingAngle={2}>
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
    </div>
  );
}
