"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { LoadingSkeleton } from "@/components/ui";

interface AuditEntry { id: string; action: string; entityType: string; createdAt: string; user?: { name: string } | null }

export default function SettingsPage() {
  const { user } = useAuth();
  const [orgName, setOrgName] = useState("");
  const [audit, setAudit] = useState<AuditEntry[] | null>(null);

  useEffect(() => {
    api<any[]>("/organizations/list").then((list) => setOrgName(list?.[0]?.name ?? "")).catch(() => undefined);
    api<{ items: AuditEntry[] }>("/admin/audit-logs").then((r) => setAudit(r.items)).catch(() => setAudit([]));
  }, []);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <h1 className="text-xl font-bold text-ink-900">Organization settings</h1>
        <p className="text-xs text-slate-500">Profile, access control and audit trail</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <p className="label">Organization</p>
          <p className="mt-1 text-lg font-black text-ink-900">{orgName || "…"}</p>
          <p className="mt-3 text-xs text-slate-500">Signed in as</p>
          <p className="text-sm font-semibold text-slate-800">{user?.name} · {user?.email}</p>
          <Link href="/users" className="btn-secondary mt-4 !text-xs">Manage users & roles</Link>
        </div>
        <div className="card p-5">
          <p className="label">Data export</p>
          <p className="mt-1 text-sm text-slate-600">Download workspace records as CSV from the reports center.</p>
          <Link href="/reports" className="btn-secondary mt-4 !text-xs">Open reports</Link>
        </div>
      </div>
      <div className="card p-5">
        <p className="label">Recent audit log</p>
        {!audit && <LoadingSkeleton rows={5} />}
        {audit && audit.length === 0 && <p className="py-6 text-center text-xs text-slate-400">No audit events yet</p>}
        {audit && audit.length > 0 && (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50"><tr><th className="th">Time</th><th className="th">Actor</th><th className="th">Action</th><th className="th">Entity</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {audit.slice(0, 20).map((a) => (
                  <tr key={a.id}>
                    <td className="td text-xs text-slate-500">{new Date(a.createdAt).toLocaleString()}</td>
                    <td className="td text-xs">{a.user?.name || "system"}</td>
                    <td className="td font-mono text-[10px]">{a.action}</td>
                    <td className="td text-xs">{a.entityType}</td>
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
