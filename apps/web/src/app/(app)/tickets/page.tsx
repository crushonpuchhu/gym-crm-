"use client";
import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { StatusBadge, PriorityBadge, EmptyState, ErrorState, LoadingSkeleton, Modal, FormField } from "@/components/ui";
import { Inbox, Plus, Send } from "lucide-react";

interface Comment { id: string; body: string; isInternal: boolean; createdAt: string; author: { name: string } }
interface Ticket { id: string; ticketNumber: string; subject: string; reporterName: string; reporterEmail: string; category: string; status: string; priority: string; owner?: { name: string } | null; location?: { name: string } | null; comments?: Comment[]; createdAt: string }
interface TicketList { items: Ticket[]; total: number }

const STATUS_FLOW = ["NEW", "OPEN", "PENDING", "IN_PROGRESS", "RESOLVED", "CLOSED"];

export default function TicketsPage() {
  const [data, setData] = useState<TicketList | null>(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [comment, setComment] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ reporterEmail: "", reporterName: "", category: "OTHER", subject: "", description: "", priority: "MEDIUM" });
  const [formError, setFormError] = useState("");

  const load = async () => {
    setError("");
    try {
      setData(await api<TicketList>("/tickets?limit=25"));
    } catch (err: any) {
      setError(err?.message || "Failed to load tickets");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const openTicket = async (id: string) => {
    try {
      setSelected(await api<Ticket>(`/tickets/${id}`));
    } catch {
      alert("Failed to load ticket");
    }
  };

  const createTicket = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");
    try {
      await api("/tickets", { method: "POST", body: JSON.stringify(form) });
      setModalOpen(false);
      setForm({ reporterEmail: "", reporterName: "", category: "OTHER", subject: "", description: "", priority: "MEDIUM" });
      await load();
    } catch (err: any) {
      setFormError(err?.message || "Failed to create ticket");
    }
  };

  const addComment = async (e: FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    try {
      await api(`/tickets/${selected.id}/comments`, { method: "POST", body: JSON.stringify({ body: comment, isInternal }) });
      setComment("");
      setSelected(await api<Ticket>(`/tickets/${selected.id}`));
    } catch (err: any) {
      alert(err?.message || "Failed to add comment");
    }
  };

  const setStatus = async (status: string) => {
    if (!selected) return;
    try {
      await api(`/tickets/${selected.id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      setSelected(await api<Ticket>(`/tickets/${selected.id}`));
      await load();
    } catch (err: any) {
      alert(err?.message || "Failed to update status");
    }
  };

  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!data) return <LoadingSkeleton />;

  return (
    <div className="grid h-[calc(100vh-7rem)] grid-cols-1 gap-4 lg:grid-cols-5">
      <div className="card col-span-2 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <div className="flex items-center gap-2">
            <Inbox size={17} className="text-accent-600" />
            <p className="text-sm font-bold text-ink-900">Member support · {data.total}</p>
          </div>
          <button className="btn-primary !px-3 !py-1.5 text-xs" onClick={() => setModalOpen(true)}><Plus size={14} /> New</button>
        </div>
        <div className="flex-1 divide-y divide-slate-100 overflow-y-auto">
          {data.items.length === 0 && <EmptyState title="No tickets" hint="Inbound support requests will appear here." />}
          {data.items.map((t) => (
            <button key={t.id} onClick={() => void openTicket(t.id)} className={`flex w-full flex-col gap-1 p-4 text-left transition hover:bg-slate-50 ${selected?.id === t.id ? "bg-accent-50" : ""}`}>
              <div className="flex w-full items-center justify-between gap-2">
                <span className="text-[10px] font-mono font-bold text-slate-400">{t.ticketNumber}</span>
                <PriorityBadge priority={t.priority} />
              </div>
              <p className="line-clamp-1 text-sm font-semibold text-slate-800">{t.subject}</p>
              <div className="flex items-center gap-2">
                <StatusBadge status={t.status} />
                <span className="text-[10px] text-slate-400">{t.reporterName}</span>
                <span className="ml-auto rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-500">{t.category.replaceAll("_", " ")}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="card col-span-3 flex flex-col overflow-hidden">
        {!selected ? (
          <div className="flex flex-1 items-center justify-center text-sm text-slate-400">Select a ticket to view the conversation</div>
        ) : (
          <>
            <div className="border-b border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] font-mono font-bold uppercase text-slate-400">{selected.ticketNumber}</p>
                  <p className="text-base font-bold text-ink-900">{selected.subject}</p>
                  <p className="text-xs text-slate-500">{selected.reporterName} · {selected.reporterEmail}{selected.location ? ` · ${selected.location.name}` : ""}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={selected.status} />
                  <PriorityBadge priority={selected.priority} />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {STATUS_FLOW.map((s) => (
                  <button key={s} onClick={() => void setStatus(s)} className={`rounded-full border px-2 py-1 text-[10px] font-bold transition ${selected.status === s ? "border-accent-600 bg-accent-600 text-white" : "border-slate-200 text-slate-500 hover:border-accent-400"}`}>{s.replaceAll("_", " ")}</button>
                ))}
              </div>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {(selected.comments || []).map((c) => (
                <div key={c.id} className={`max-w-[80%] rounded-xl p-3 text-sm ${c.isInternal ? "ml-auto bg-amber-50 text-amber-900" : "bg-slate-100 text-slate-700"}`}>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wide opacity-70">{c.author?.name} · {new Date(c.createdAt).toLocaleString()}{c.isInternal ? " · internal note" : ""}</p>
                  {c.body}
                </div>
              ))}
              {(selected.comments || []).length === 0 && <p className="pt-8 text-center text-xs text-slate-400">No conversation yet. First response starts the SLA clock.</p>}
            </div>
            <form onSubmit={addComment} className="border-t border-slate-200 p-3">
              <div className="flex items-center gap-2">
                <input className="input flex-1" placeholder="Write a reply…" value={comment} onChange={(e) => setComment(e.target.value)} required aria-label="Reply" />
                <label className="flex cursor-pointer items-center gap-1 text-[10px] font-bold uppercase text-slate-500">
                  <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} /> Internal
                </label>
                <button type="submit" className="btn-primary !px-3" aria-label="Send reply"><Send size={16} /></button>
              </div>
            </form>
          </>
        )}
      </div>

      <Modal open={modalOpen} title="New ticket" onClose={() => setModalOpen(false)}>
        <form onSubmit={createTicket} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Member name"><input className="input" value={form.reporterName} onChange={(e) => setForm({ ...form, reporterName: e.target.value })} required /></FormField>
            <FormField label="Member email"><input className="input" type="email" value={form.reporterEmail} onChange={(e) => setForm({ ...form, reporterEmail: e.target.value })} required /></FormField>
          </div>
          <FormField label="Category">
            <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option>BILLING</option><option>EQUIPMENT</option><option>CLASS_BOOKING</option><option>ACCESS</option><option>CLEANLINESS</option><option>STAFF</option><option>OTHER</option>
            </select>
          </FormField>
          <FormField label="Subject"><input className="input" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required /></FormField>
          <FormField label="Description"><textarea className="input min-h-20" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required /></FormField>
          <FormField label="Priority"><select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}><option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>URGENT</option></select></FormField>
          {formError && <p className="text-sm text-rose-600">{formError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary">Create ticket</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
