"use client";
import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { EmptyState, ErrorState, LoadingSkeleton, Modal, FormField, PaginationBar, StatusBadge } from "@/components/ui";
import { Plus, Search, Trash2 } from "lucide-react";

interface Member {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  fitnessGoal: string | null;
  status: string;
  location: { id: string; name: string } | null;
  memberships: { id: string; status: string; monthlyValue: string; plan: { name: string } | null }[];
}
interface MemberList { items: Member[]; total: number; page: number; pages: number }
interface Location { id: string; name: string }

export default function MembersPage() {
  const [data, setData] = useState<MemberList | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", locationId: "", status: "ACTIVE", fitnessGoal: "" });
  const [formError, setFormError] = useState("");

  const load = async () => {
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), limit: "15" });
      if (search.trim()) params.set("search", search.trim());
      setData(await api<MemberList>(`/members?${params.toString()}`));
    } catch (err: any) {
      setError(err?.message || "Failed to load members");
    }
  };

  useEffect(() => {
    void load();
  }, [page, search]);

  // The shell search submits ?search=; pick it up without useSearchParams
  // so this page can stay statically prerendered.
  useEffect(() => {
    const query = new URLSearchParams(window.location.search).get("search");
    if (query) setSearch(query);
  }, []);

  // The shell search may push while this page is already mounted.
  useEffect(() => {
    const onSearch = (event: Event) => {
      setPage(1);
      setSearch((event as CustomEvent<string>).detail ?? "");
    };
    window.addEventListener("gym:search", onSearch);
    return () => window.removeEventListener("gym:search", onSearch);
  }, []);

  useEffect(() => {
    api<{ items: Location[] }>("/locations?limit=50").then((r) => setLocations(r.items)).catch(() => undefined);
  }, []);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");
    try {
      await api("/members", { method: "POST", body: JSON.stringify({ ...form, locationId: form.locationId || undefined }) });
      setModalOpen(false);
      setForm({ firstName: "", lastName: "", email: "", phone: "", locationId: "", status: "ACTIVE", fitnessGoal: "" });
      await load();
    } catch (err: any) {
      setFormError(err?.message || "Failed to create member");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Cancel and archive this member?")) return;
    try {
      await api(`/members/${id}`, { method: "DELETE" });
      await load();
    } catch (err: any) {
      alert(err?.message || "Delete failed");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink-900">Members</h1>
          <p className="text-xs text-slate-500">{data?.total ?? 0} people on record</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input !w-64 !pl-9"
              placeholder="Search name, email, phone…"
              value={search}
              onChange={(e) => { setPage(1); setSearch(e.target.value); }}
              aria-label="Search the member list"
            />
          </div>
          <button className="btn-primary" onClick={() => setModalOpen(true)}><Plus size={16} /> New member</button>
        </div>
      </div>
      {error && <ErrorState message={error} onRetry={() => void load()} />}
      {!data && !error && <LoadingSkeleton />}
      {data && data.items.length === 0 && (search ? <EmptyState title="No matches" hint={`Nobody matches “${search}”. Try a different name, email or phone.`} /> : <EmptyState title="No members yet" hint="Create the first member or convert a prospect." />)}
      {data && data.items.length > 0 && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">Member</th>
                  <th className="th">Club</th>
                  <th className="th">Plan</th>
                  <th className="th">Status</th>
                  <th className="th">Goal</th>
                  <th className="th text-right">Remove</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((m) => {
                  const contract = m.memberships[0];
                  return (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="td">
                        <p className="font-semibold text-slate-800">{m.firstName} {m.lastName}</p>
                        <p className="text-xs text-slate-500">{m.email || m.phone || "—"}</p>
                      </td>
                      <td className="td text-xs">{m.location?.name || "—"}</td>
                      <td className="td text-xs">
                        <p className="font-medium text-slate-700">{contract?.plan?.name || "No plan"}</p>
                        <p className="text-slate-400">{contract ? `$${Number(contract.monthlyValue).toFixed(0)}/mo` : ""}</p>
                      </td>
                      <td className="td"><StatusBadge status={m.status} /></td>
                      <td className="td text-xs">{m.fitnessGoal || "—"}</td>
                      <td className="td"><div className="flex justify-end"><button className="rounded-lg p-2 text-rose-600 hover:bg-rose-50" onClick={() => void remove(m.id)} aria-label="Archive member"><Trash2 size={16} /></button></div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <PaginationBar page={data.page} pages={data.pages} total={data.total} onPage={setPage} />
        </div>
      )}
      <Modal open={modalOpen} title="New member" onClose={() => setModalOpen(false)}>
        <form onSubmit={create} className="grid grid-cols-2 gap-3">
          <FormField label="First name"><input className="input" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required /></FormField>
          <FormField label="Last name"><input className="input" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required /></FormField>
          <FormField label="Email"><input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></FormField>
          <FormField label="Phone"><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></FormField>
          <FormField label="Home club">
            <select className="input" value={form.locationId} onChange={(e) => setForm({ ...form, locationId: e.target.value })}>
              <option value="">Unassigned</option>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </FormField>
          <FormField label="Status">
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option>TRIAL</option><option>ACTIVE</option><option>PAUSED</option><option>CANCELLED</option><option>EXPIRED</option>
            </select>
          </FormField>
          <FormField label="Fitness goal"><input className="input" value={form.fitnessGoal} onChange={(e) => setForm({ ...form, fitnessGoal: e.target.value })} placeholder="Build strength" /></FormField>
          {formError && <p className="col-span-2 text-sm text-rose-600">{formError}</p>}
          <div className="col-span-2 flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary">Create member</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
