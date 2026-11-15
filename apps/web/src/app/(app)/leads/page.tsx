"use client";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import {
  StatusBadge, PriorityBadge, EmptyState, ErrorState, LoadingSkeleton,
  Modal, PaginationBar, FormField,
} from "@/components/ui";
import { Plus, Search, Trash2, ArrowRightLeft, Filter } from "lucide-react";

interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  status: string;
  priority: string;
  score: number;
  value: string | null;
  owner: { id: string; name: string } | null;
}
interface LeadList { items: Lead[]; total: number; page: number; limit: number; pages: number }

const STATUS_OPTIONS = ["", "NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "CONVERTED", "DISQUALIFIED"];
const SOURCE_OPTIONS = ["WEBSITE", "REFERRAL", "COLD_CALL", "EMAIL", "EVENT", "OTHER"];

export default function LeadsPage() {
  const [data, setData] = useState<LeadList | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", company: "", source: "WEBSITE", priority: "MEDIUM", value: "" });
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), limit: "15" });
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      setData(await api<LeadList>(`/leads?${params.toString()}`));
    } catch (err: any) {
      setError(err?.message || "Failed to load leads");
    }
  }, [page, search, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const createLead = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");
    try {
      await api("/leads", {
        method: "POST",
        body: JSON.stringify({ ...form, value: form.value ? Number(form.value) : undefined }),
      });
      setModalOpen(false);
      setForm({ firstName: "", lastName: "", email: "", phone: "", company: "", source: "WEBSITE", priority: "MEDIUM", value: "" });
      await load();
    } catch (err: any) {
      setFormError(err?.message || "Failed to create lead");
    }
  };

  const convertLead = async (id: string) => {
    setBusy(true);
    try {
      await api(`/leads/${id}/convert`, { method: "POST" });
      await load();
    } catch (err: any) {
      alert(err?.message || "Convert failed");
    } finally {
      setBusy(false);
    }
  };

  const deleteLead = async (id: string) => {
    if (!confirm("Delete this lead?")) return;
    setBusy(true);
    try {
      await api(`/leads/${id}`, { method: "DELETE" });
      await load();
    } catch (err: any) {
      alert(err?.message || "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink-900">Leads</h1>
          <p className="text-xs text-slate-500">{data?.total ?? 0} records in this workspace</p>
        </div>
        <button className="btn-primary" onClick={() => setModalOpen(true)}><Plus size={16} /> New lead</button>
      </div>

      <div className="card flex flex-wrap items-center gap-2 p-3">
        <div className="relative min-w-56 flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input !pl-9" placeholder="Search name, email…" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} aria-label="Search leads" />
        </div>
        <div className="relative">
          <Filter size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <select className="input !pl-9" value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }} aria-label="Filter by status">
            {STATUS_OPTIONS.map((s) => (<option key={s} value={s}>{s ? s.replaceAll("_", " ") : "All statuses"}</option>))}
          </select>
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={() => void load()} />}
      {!data && !error && <LoadingSkeleton />}
      {data && data.items.length === 0 && <EmptyState title="No leads found" hint="Adjust filters or create the first lead for this workspace." />}
      {data && data.items.length > 0 && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">Lead</th>
                  <th className="th">Company</th>
                  <th className="th">Status</th>
                  <th className="th">Priority</th>
                  <th className="th">Score</th>
                  <th className="th">Owner</th>
                  <th className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50">
                    <td className="td">
                      <p className="font-semibold text-slate-800">{lead.firstName} {lead.lastName}</p>
                      <p className="text-xs text-slate-500">{lead.email}</p>
                    </td>
                    <td className="td">{lead.company || "—"}</td>
                    <td className="td"><StatusBadge status={lead.status} /></td>
                    <td className="td"><PriorityBadge priority={lead.priority} /></td>
                    <td className="td font-mono text-xs">{lead.score}</td>
                    <td className="td text-xs">{lead.owner?.name || "—"}</td>
                    <td className="td">
                      <div className="flex justify-end gap-1">
                        <button title="Convert to customer" className="rounded-lg p-2 text-accent-600 hover:bg-accent-50" onClick={() => void convertLead(lead.id)} disabled={busy} aria-label="Convert lead"><ArrowRightLeft size={16} /></button>
                        <button title="Delete lead" className="rounded-lg p-2 text-rose-600 hover:bg-rose-50" onClick={() => void deleteLead(lead.id)} disabled={busy} aria-label="Delete lead"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationBar page={data.page} pages={data.pages} total={data.total} onPage={setPage} />
        </div>
      )}

      <Modal open={modalOpen} title="New lead" onClose={() => setModalOpen(false)}>
        <form onSubmit={createLead} className="grid grid-cols-2 gap-3">
          <FormField label="First name"><input className="input" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required /></FormField>
          <FormField label="Last name"><input className="input" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required /></FormField>
          <FormField label="Email"><input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></FormField>
          <FormField label="Phone"><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></FormField>
          <FormField label="Company"><input className="input" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></FormField>
          <FormField label="Deal value"><input className="input" type="number" min="0" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} /></FormField>
          <FormField label="Source"><select className="input" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>{SOURCE_OPTIONS.map((s) => <option key={s}>{s}</option>)}</select></FormField>
          <FormField label="Priority"><select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}><option>LOW</option><option>MEDIUM</option><option>HIGH</option></select></FormField>
          {formError && <p className="col-span-2 text-sm text-rose-600">{formError}</p>}
          <div className="col-span-2 flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary">Create lead</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
