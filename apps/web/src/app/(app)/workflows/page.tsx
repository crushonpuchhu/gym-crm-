"use client";
import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { LoadingSkeleton, ErrorState, EmptyState, FormField } from "@/components/ui";
import { Workflow, Plus, Zap, ZapOff } from "lucide-react";

interface WorkflowItem { id: string; name: string; trigger: string; isActive: boolean; condition: any; actions: any[] }

export default function WorkflowsPage() {
  const [items, setItems] = useState<WorkflowItem[] | null>(null);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", trigger: "prospect.created", actionType: "create_task", actionValue: "" });
  const [formError, setFormError] = useState("");

  const load = async () => {
    setError("");
    try {
      setItems(await api<WorkflowItem[]>("/workflows"));
    } catch (err: any) {
      setError(err?.message || "Failed to load workflows");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");
    try {
      await api("/workflows", {
        method: "POST",
        body: JSON.stringify({ name: form.name, trigger: form.trigger, condition: {}, actions: [{ type: form.actionType, value: form.actionValue }], isActive: true }),
      });
      setShowForm(false);
      setForm({ name: "", trigger: "prospect.created", actionType: "create_task", actionValue: "" });
      await load();
    } catch (err: any) {
      setFormError(err?.message || "Failed to create workflow");
    }
  };

  const toggle = async (w: WorkflowItem) => {
    try {
      await api(`/workflows/${w.id}`, { method: "PATCH", body: JSON.stringify({ isActive: !w.isActive }) });
      await load();
    } catch (err: any) {
      alert(err?.message || "Toggle failed");
    }
  };

  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!items) return <LoadingSkeleton />;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink-900">Workflow automation</h1>
          <p className="text-xs text-slate-500">Trigger → action rules for enquiries, renewals and win-backs</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm((v) => !v)}><Plus size={16} /> New workflow</button>
      </div>
      {showForm && (
        <form onSubmit={create} className="card grid grid-cols-2 gap-3 p-4">
          <FormField label="Workflow name"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Website enquiries get a follow-up" /></FormField>
          <FormField label="Trigger">
            <select className="input" value={form.trigger} onChange={(e) => setForm({ ...form, trigger: e.target.value })}>
              <option value="prospect.created">Prospect created</option>
              <option value="prospect.toured">Club tour completed</option>
              <option value="prospect.trial_ending">Trial ending soon</option>
              <option value="membership.created">Membership created</option>
              <option value="membership.won">Membership joined</option>
              <option value="membership.cancelled">Membership cancelled</option>
              <option value="checkin.inactive">No check-in for N days</option>
              <option value="payment.failed">Payment failed</option>
              <option value="ticket.created">Support ticket created</option>
              <option value="ticket.sla_approaching">Ticket SLA approaching</option>
              <option value="task.overdue">Task overdue</option>
            </select>
          </FormField>
          <FormField label="Action"><select className="input" value={form.actionType} onChange={(e) => setForm({ ...form, actionType: e.target.value })}><option value="create_task">Create follow-up task</option><option value="send_email">Send email notification</option><option value="assign_owner">Assign to an advisor</option><option value="notify">Notify the member</option></select></FormField>
          <FormField label="Action value"><input className="input" value={form.actionValue} onChange={(e) => setForm({ ...form, actionValue: e.target.value })} placeholder="e.g. Call within 24h" /></FormField>
          {formError && <p className="col-span-2 text-sm text-rose-600">{formError}</p>}
          <div className="col-span-2 flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" className="btn-primary">Create workflow</button>
          </div>
        </form>
      )}
      {items.length === 0 && <EmptyState title="No workflows" hint="Automate trial follow-ups, dunning and win-back campaigns." />}
      <div className="space-y-3">
        {items.map((w) => (
          <div key={w.id} className="card flex items-center gap-4 p-4">
            <div className={`rounded-lg p-2 ${w.isActive ? "bg-accent-50 text-accent-600" : "bg-slate-100 text-slate-400"}`}><Workflow size={18} /></div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-ink-900">{w.name}</p>
              <p className="text-[10px] uppercase tracking-wide text-slate-400">trigger: {w.trigger} · {(w.actions?.length ?? 0)} actions</p>
            </div>
            <button onClick={() => void toggle(w)} className={`btn-secondary !px-3 !py-1.5 text-xs ${w.isActive ? "text-emerald-700" : "text-slate-400"}`}>
              {w.isActive ? <><Zap size={13} /> Active</> : <><ZapOff size={13} /> Paused</>}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
