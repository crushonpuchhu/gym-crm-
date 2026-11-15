"use client";
import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { EmptyState, ErrorState, LoadingSkeleton, Modal, FormField, PaginationBar } from "@/components/ui";
import { Plus, Trash2, Users } from "lucide-react";

interface ContactMini { id: string; firstName: string; lastName: string; email: string | null }
interface Company { id: string; name: string; industry: string | null; website: string | null; employees: number | null; revenueRange: string | null; contacts?: ContactMini[] }
interface CompanyList { items: Company[]; total: number; page: number; pages: number }

export default function CompaniesPage() {
  const [data, setData] = useState<CompanyList | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: "", industry: "", website: "", employees: "", revenueRange: "" });
  const [formError, setFormError] = useState("");

  const load = async () => {
    setError("");
    try {
      setData(await api<CompanyList>(`/companies?page=${page}&limit=15`));
    } catch (err: any) {
      setError(err?.message || "Failed to load companies");
    }
  };

  useEffect(() => {
    void load();
  }, [page]);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");
    try {
      await api("/companies", { method: "POST", body: JSON.stringify({ ...form, employees: form.employees ? Number(form.employees) : undefined }) });
      setModalOpen(false);
      setForm({ name: "", industry: "", website: "", employees: "", revenueRange: "" });
      await load();
    } catch (err: any) {
      setFormError(err?.message || "Failed to create company");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this company?")) return;
    try {
      await api(`/companies/${id}`, { method: "DELETE" });
      await load();
    } catch (err: any) {
      alert(err?.message || "Delete failed");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink-900">Companies</h1>
          <p className="text-xs text-slate-500">{data?.total ?? 0} organizations</p>
        </div>
        <button className="btn-primary" onClick={() => setModalOpen(true)}><Plus size={16} /> New company</button>
      </div>
      {error && <ErrorState message={error} onRetry={() => void load()} />}
      {!data && !error && <LoadingSkeleton />}
      {data && data.items.length === 0 && <EmptyState title="No companies yet" hint="Create the first company record." />}
      {data && data.items.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.items.map((co) => (
            <div key={co.id} className="card flex flex-col p-5">
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent-50 text-lg font-black text-accent-600">{co.name.slice(0, 1).toUpperCase()}</div>
                <button className="rounded-lg p-2 text-rose-500 hover:bg-rose-50" onClick={() => void remove(co.id)} aria-label="Delete company"><Trash2 size={16} /></button>
              </div>
              <p className="mt-3 text-base font-bold text-ink-900">{co.name}</p>
              <p className="text-xs text-slate-500">{co.industry || "No industry set"} {co.website ? `· ${co.website}` : ""}</p>
              <div className="mt-4 flex flex-wrap gap-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
                <span>{co.employees ?? 0} employees</span>
                <span>{co.revenueRange || "revenue unknown"}</span>
                <span className="inline-flex items-center gap-1"><Users size={12} /> {co.contacts?.length ?? 0} contacts</span>
              </div>
            </div>
          ))}
        </div>
      )}
      {data && <PaginationBar page={data.page} pages={data.pages} total={data.total} onPage={setPage} />}
      <Modal open={modalOpen} title="New company" onClose={() => setModalOpen(false)}>
        <form onSubmit={create} className="grid grid-cols-2 gap-3">
          <FormField label="Company name"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></FormField>
          <FormField label="Industry"><input className="input" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} /></FormField>
          <FormField label="Website"><input className="input" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /></FormField>
          <FormField label="Employees"><input className="input" type="number" min="0" value={form.employees} onChange={(e) => setForm({ ...form, employees: e.target.value })} /></FormField>
          <FormField label="Revenue range"><input className="input" placeholder="$10–50M" value={form.revenueRange} onChange={(e) => setForm({ ...form, revenueRange: e.target.value })} /></FormField>
          {formError && <p className="col-span-2 text-sm text-rose-600">{formError}</p>}
          <div className="col-span-2 flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary">Create company</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
