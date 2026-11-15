"use client";
import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { EmptyState, ErrorState, LoadingSkeleton, Modal, FormField, PaginationBar } from "@/components/ui";
import { Plus, Trash2 } from "lucide-react";

interface Contact { id: string; firstName: string; lastName: string; email: string | null; phone: string | null; position: string | null; company: { name: string } | null; }
interface ContactList { items: Contact[]; total: number; page: number; pages: number }

export default function ContactsPage() {
  const [data, setData] = useState<ContactList | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", position: "" });
  const [formError, setFormError] = useState("");

  const load = async () => {
    setError("");
    try {
      setData(await api<ContactList>(`/contacts?page=${page}&limit=15`));
    } catch (err: any) {
      setError(err?.message || "Failed to load contacts");
    }
  };

  useEffect(() => {
    void load();
  }, [page]);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");
    try {
      await api("/contacts", { method: "POST", body: JSON.stringify(form) });
      setModalOpen(false);
      setForm({ firstName: "", lastName: "", email: "", phone: "", position: "" });
      await load();
    } catch (err: any) {
      setFormError(err?.message || "Failed to create contact");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this contact?")) return;
    try {
      await api(`/contacts/${id}`, { method: "DELETE" });
      await load();
    } catch (err: any) {
      alert(err?.message || "Delete failed");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink-900">Contacts</h1>
          <p className="text-xs text-slate-500">{data?.total ?? 0} records</p>
        </div>
        <button className="btn-primary" onClick={() => setModalOpen(true)}><Plus size={16} /> New contact</button>
      </div>
      {error && <ErrorState message={error} onRetry={() => void load()} />}
      {!data && !error && <LoadingSkeleton />}
      {data && data.items.length === 0 && <EmptyState title="No contacts yet" hint="Create the first contact or convert a lead." />}
      {data && data.items.length > 0 && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50"><tr><th className="th">Name</th><th className="th">Email</th><th className="th">Phone</th><th className="th">Position</th><th className="th">Company</th><th className="th text-right">Remove</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="td font-semibold text-slate-800">{c.firstName} {c.lastName}</td>
                    <td className="td text-xs">{c.email || "—"}</td>
                    <td className="td text-xs">{c.phone || "—"}</td>
                    <td className="td">{c.position || "—"}</td>
                    <td className="td">{c.company?.name || "—"}</td>
                    <td className="td"><div className="flex justify-end"><button className="rounded-lg p-2 text-rose-600 hover:bg-rose-50" onClick={() => void remove(c.id)} aria-label="Delete contact"><Trash2 size={16} /></button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationBar page={data.page} pages={data.pages} total={data.total} onPage={setPage} />
        </div>
      )}
      <Modal open={modalOpen} title="New contact" onClose={() => setModalOpen(false)}>
        <form onSubmit={create} className="grid grid-cols-2 gap-3">
          <FormField label="First name"><input className="input" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required /></FormField>
          <FormField label="Last name"><input className="input" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required /></FormField>
          <FormField label="Email"><input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></FormField>
          <FormField label="Phone"><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></FormField>
          <FormField label="Position"><input className="input" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} /></FormField>
          {formError && <p className="col-span-2 text-sm text-rose-600">{formError}</p>}
          <div className="col-span-2 flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary">Create contact</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
