"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { LoadingSkeleton, ErrorState } from "@/components/ui";
import { ShieldCheck, UserRound } from "lucide-react";

interface OrgUser { id: string; name: string; email: string; role: string }
const ROLES = ["ORG_OWNER", "ORG_ADMIN", "SALES_MANAGER", "SALES_REP", "SUPPORT_MANAGER", "SUPPORT_AGENT", "VIEWER"];

export default function UsersPage() {
  const [users, setUsers] = useState<OrgUser[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setError("");
    try {
      setUsers(await api<OrgUser[]>("/users"));
    } catch (err: any) {
      setError(err?.message || "Failed to load users");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const changeRole = async (id: string, role: string) => {
    setBusy(true);
    try {
      await api(`/users/${id}/role`, { method: "PATCH", body: JSON.stringify({ role }) });
      await load();
    } catch (err: any) {
      alert(err?.message || "Role change failed");
    } finally {
      setBusy(false);
    }
  };

  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!users) return <LoadingSkeleton />;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <h1 className="text-xl font-bold text-ink-900">Users & roles</h1>
        <p className="text-xs text-slate-500">Role-based access control · {users.length} members</p>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full">
          <thead className="bg-slate-50"><tr><th className="th">Member</th><th className="th">Role</th><th className="th text-right">Change role</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="td">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500"><UserRound size={16} /></div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{u.name}</p>
                      <p className="text-[10px] text-slate-500">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="td"><span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-slate-600"><ShieldCheck size={12} />{u.role.replaceAll("_", " ")}</span></td>
                <td className="td">
                  <div className="flex justify-end">
                    <select className="input w-44" value={u.role} disabled={busy} onChange={(e) => void changeRole(u.id, e.target.value)} aria-label="Change role">
                      {ROLES.map((r) => (<option key={r} value={r}>{r.replaceAll("_", " ")}</option>))}
                    </select>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
