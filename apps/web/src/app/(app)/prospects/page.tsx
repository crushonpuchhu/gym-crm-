"use client";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  StatusBadge, PriorityBadge, EmptyState, ErrorState, LoadingSkeleton,
  Modal, PaginationBar, FormField,
} from "@/components/ui";
import { Plus, Search, Trash2, ArrowRightLeft, Filter, Upload } from "lucide-react";

interface Prospect {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  fitnessGoal: string | null;
  status: string;
  priority: string;
  score: number;
  value: string | null;
  owner: { id: string; name: string } | null;
  location: { id: string; name: string } | null;
}
interface ProspectList { items: Prospect[]; total: number; page: number; limit: number; pages: number }
interface Location { id: string; name: string }

const STATUS_OPTIONS = ["", "NEW", "CONTACTED", "TOUR_BOOKED", "TOURED", "TRIAL", "NEGOTIATING", "JOINED", "LOST"];
const SOURCE_OPTIONS = ["WALK_IN", "WEBSITE", "REFERRAL", "INSTAGRAM", "FACEBOOK", "GOOGLE", "EVENT", "PARTNER", "OTHER"];

export default function ProspectsPage() {
  const [data, setData] = useState<ProspectList | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [csvText, setCsvText] = useState("firstname,lastname,email,phone,source,priority,value,fitnessgoal\n");
  const [importResult, setImportResult] = useState("");
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", locationId: "", source: "WALK_IN", priority: "MEDIUM", value: "", fitnessGoal: "" });
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), limit: "15" });
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      setData(await api<ProspectList>(`/prospects?${params.toString()}`));
    } catch (err: any) {
      setError(err?.message || "Failed to load prospects");
    }
  }, [page, search, status]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    api<{ items: Location[] }>("/locations?limit=50").then((r) => setLocations(r.items)).catch(() => undefined);
  }, []);

  const createProspect = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");
    try {
      await api("/prospects", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          locationId: form.locationId || undefined,
          value: form.value ? Number(form.value) : undefined,
        }),
      });
      setModalOpen(false);
      setForm({ firstName: "", lastName: "", email: "", phone: "", locationId: "", source: "WALK_IN", priority: "MEDIUM", value: "", fitnessGoal: "" });
      await load();
    } catch (err: any) {
      setFormError(err?.message || "Failed to create prospect");
    }
  };

  const convertProspect = async (id: string) => {
    setBusy(true);
    try {
      await api(`/prospects/${id}/convert`, { method: "POST" });
      await load();
    } catch (err: any) {
      alert(err?.message || "Convert failed");
    } finally {
      setBusy(false);
    }
  };

  const importCsv = async () => {
    setImportResult("");
    try {
      const result = await api<{ created: number; rejected: number; errors: string[] }>("/prospects/import", {
        method: "POST",
        body: JSON.stringify({ csv: csvText }),
      });
      setImportResult(`Imported ${result.created} prospect(s), rejected ${result.rejected}.${result.errors.length ? " " + result.errors.join("; ") : ""}`);
      await load();
    } catch (err: any) {
      setImportResult(err?.message || "Import failed");
    }
  };

  const deleteProspect = async (id: string) => {
    if (!confirm("Delete this prospect?")) return;
    setBusy(true);
    try {
      await api(`/prospects/${id}`, { method: "DELETE" });
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
          <h1 className="text-xl font-bold text-ink-900">Prospects</h1>
          <p className="text-xs text-slate-500">{data?.total ?? 0} enquiries, trials and guest passes</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={() => setImportOpen(true)}><Upload size={16} /> Import CSV</button>
          <button className="btn-primary" onClick={() => setModalOpen(true)}><Plus size={16} /> New prospect</button>
        </div>
      </div>

      <div className="card flex flex-wrap items-center gap-2 p-3">
        <div className="relative min-w-56 flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input !pl-9" placeholder="Search name, email, phone…" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} aria-label="Search prospects" />
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
      {data && data.items.length === 0 && <EmptyState title="No prospects found" hint="Adjust filters or add the first enquiry from the front desk." />}
      {data && data.items.length > 0 && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">Prospect</th>
                  <th className="th">Club</th>
                  <th className="th">Goal</th>
                  <th className="th">Status</th>
                  <th className="th">Score</th>
                  <th className="th">Owner</th>
                  <th className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((prospect) => (
                  <tr key={prospect.id} className="hover:bg-slate-50">
                    <td className="td">
                      <p className="font-semibold text-slate-800">{prospect.firstName} {prospect.lastName}</p>
                      <p className="text-xs text-slate-500">{prospect.email}</p>
                    </td>
                    <td className="td text-xs">{prospect.location?.name || "—"}</td>
                    <td className="td text-xs">{prospect.fitnessGoal || "—"}</td>
                    <td className="td">
                      <div className="flex flex-col gap-1">
                        <StatusBadge status={prospect.status} />
                        <PriorityBadge priority={prospect.priority} />
                      </div>
                    </td>
                    <td className="td font-mono text-xs">{prospect.score}</td>
                    <td className="td text-xs">{prospect.owner?.name || "—"}</td>
                    <td className="td">
                      <div className="flex justify-end gap-1">
                        <button title="Convert to member" className="rounded-lg p-2 text-accent-600 hover:bg-accent-50" onClick={() => void convertProspect(prospect.id)} disabled={busy} aria-label="Convert prospect"><ArrowRightLeft size={16} /></button>
                        <button title="Delete prospect" className="rounded-lg p-2 text-rose-600 hover:bg-rose-50" onClick={() => void deleteProspect(prospect.id)} disabled={busy} aria-label="Delete prospect"><Trash2 size={16} /></button>
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

      <Modal open={importOpen} title="Import prospects from CSV" onClose={() => setImportOpen(false)}>
        <p className="mb-2 text-xs text-slate-500">Header row required: <code>firstname,lastname,email,phone,source,priority,value,fitnessgoal</code>. Source and priority are case-insensitive.</p>
        <textarea className="input h-40 font-mono text-xs" value={csvText} onChange={(e) => setCsvText(e.target.value)} spellCheck={false} />
        {importResult && <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">{importResult}</p>}
        <div className="mt-3 flex justify-end gap-2">
          <button className="btn-secondary" onClick={() => setImportOpen(false)}>Close</button>
          <button className="btn-primary" onClick={() => void importCsv()}>Run import</button>
        </div>
      </Modal>

      <Modal open={modalOpen} title="New prospect" onClose={() => setModalOpen(false)}>
        <form onSubmit={createProspect} className="grid grid-cols-2 gap-3">
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
          <FormField label="How did they find us?"><select className="input" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>{SOURCE_OPTIONS.map((s) => <option key={s}>{s}</option>)}</select></FormField>
          <FormField label="Fitness goal"><input className="input" value={form.fitnessGoal} onChange={(e) => setForm({ ...form, fitnessGoal: e.target.value })} placeholder="Lose 10 kg" /></FormField>
          <FormField label="Monthly value ($)"><input className="input" type="number" min="0" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} /></FormField>
          <FormField label="Priority"><select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}><option>LOW</option><option>MEDIUM</option><option>HIGH</option></select></FormField>
          {formError && <p className="col-span-2 text-sm text-rose-600">{formError}</p>}
          <div className="col-span-2 flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary">Create prospect</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
