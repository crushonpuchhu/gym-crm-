"use client";
import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { EmptyState, ErrorState, LoadingSkeleton, Modal, FormField } from "@/components/ui";
import { Plus, Archive, BadgeDollarSign, CalendarDays, Repeat } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price: string;
  billingCycle: string;
  durationDays: number;
  color: string;
  isActive: boolean;
  _count: { memberships: number };
}

const CYCLE_LABEL: Record<string, string> = { MONTHLY: "per month", QUARTERLY: "per quarter", ANNUAL: "per year", ONE_TIME: "one-time" };

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", price: "", billingCycle: "MONTHLY", durationDays: "30", color: "#4f46e5" });
  const [formError, setFormError] = useState("");

  const load = async () => {
    setError("");
    try {
      setPlans(await api<Plan[]>("/plans"));
    } catch (err: any) {
      setError(err?.message || "Failed to load plans");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");
    try {
      await api("/plans", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          price: Number(form.price),
          durationDays: Number(form.durationDays),
        }),
      });
      setModalOpen(false);
      setForm({ name: "", description: "", price: "", billingCycle: "MONTHLY", durationDays: "30", color: "#4f46e5" });
      await load();
    } catch (err: any) {
      setFormError(err?.message || "Failed to create plan");
    }
  };

  const toggle = async (plan: Plan) => {
    try {
      await api(`/plans/${plan.id}`, { method: "PATCH", body: JSON.stringify({ isActive: !plan.isActive }) });
      await load();
    } catch (err: any) {
      alert(err?.message || "Update failed");
    }
  };

  const archive = async (plan: Plan) => {
    if (!confirm(`Archive ${plan.name}?`)) return;
    try {
      await api(`/plans/${plan.id}`, { method: "DELETE" });
      await load();
    } catch (err: any) {
      alert(err?.message || "Archive failed");
    }
  };

  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!plans) return <LoadingSkeleton rows={4} />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink-900">Membership plans</h1>
          <p className="text-xs text-slate-500">{plans.filter((p) => p.isActive).length} active products · {plans.reduce((s, p) => s + p._count.memberships, 0)} contracts sold</p>
        </div>
        <button className="btn-primary" onClick={() => setModalOpen(true)}><Plus size={16} /> New plan</button>
      </div>

      {plans.length === 0 && <EmptyState title="No plans yet" hint="Add the products your front desk sells." />}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {plans.map((plan) => (
          <div key={plan.id} className={`card flex flex-col p-5 ${plan.isActive ? "" : "opacity-60"}`}>
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: `${plan.color}1a`, color: plan.color }}>
                <BadgeDollarSign size={19} />
              </div>
              <div className="flex gap-1">
                <button className="rounded-lg px-2 py-1 text-[10px] font-bold uppercase text-slate-500 hover:bg-slate-100" onClick={() => void toggle(plan)}>
                  {plan.isActive ? "Active" : "Paused"}
                </button>
                <button className="rounded-lg p-2 text-rose-500 hover:bg-rose-50" onClick={() => void archive(plan)} aria-label="Archive plan"><Archive size={15} /></button>
              </div>
            </div>
            <p className="mt-3 text-base font-bold text-ink-900">{plan.name}</p>
            <p className="mt-1 text-xs text-slate-500">{plan.description || "No description"}</p>
            <p className="mt-3 text-2xl font-black text-ink-900">${Number(plan.price).toLocaleString()}<span className="ml-1 text-xs font-semibold text-slate-400">{CYCLE_LABEL[plan.billingCycle]}</span></p>
            <div className="mt-4 flex flex-wrap gap-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1"><CalendarDays size={12} /> {plan.durationDays} days</span>
              <span className="inline-flex items-center gap-1"><Repeat size={12} /> {plan._count.memberships} contracts</span>
            </div>
          </div>
        ))}
      </div>

      <Modal open={modalOpen} title="New membership plan" onClose={() => setModalOpen(false)}>
        <form onSubmit={create} className="grid grid-cols-2 gap-3">
          <FormField label="Plan name"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Unlimited Monthly" /></FormField>
          <FormField label="Price ($)"><input className="input" type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required /></FormField>
          <FormField label="Billing cycle">
            <select className="input" value={form.billingCycle} onChange={(e) => setForm({ ...form, billingCycle: e.target.value })}>
              <option>MONTHLY</option><option>QUARTERLY</option><option>ANNUAL</option><option>ONE_TIME</option>
            </select>
          </FormField>
          <FormField label="Duration (days)"><input className="input" type="number" min="1" value={form.durationDays} onChange={(e) => setForm({ ...form, durationDays: e.target.value })} /></FormField>
          <FormField label="Description"><input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="All clubs and group classes" /></FormField>
          <FormField label="Card colour"><input className="input h-10" type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} /></FormField>
          {formError && <p className="col-span-2 text-sm text-rose-600">{formError}</p>}
          <div className="col-span-2 flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary">Create plan</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
