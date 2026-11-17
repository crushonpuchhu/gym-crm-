"use client";
import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ErrorState, LoadingSkeleton, Modal, FormField } from "@/components/ui";
import { DndContext, DragEndEvent, useDraggable, useDroppable } from "@dnd-kit/core";
import { KanbanSquare, Plus, TriangleAlert } from "lucide-react";

interface Stage { id: string; name: string; order: number; probability: number; isWon: boolean; isLost: boolean }
interface Pipeline { id: string; name: string; isDefault: boolean; stages: Stage[] }
interface Contract {
  id: string;
  title: string;
  value: string;
  monthlyValue: string;
  probability: number;
  stageId: string;
  status: string;
  member?: { id: string; firstName: string; lastName: string } | null;
  plan?: { id: string; name: string } | null;
  location?: { id: string; name: string } | null;
  owner?: { name: string } | null;
}
interface ContractList { items: Contract[]; weightedRevenue: number; total: number }
interface MemberMini { id: string; firstName: string; lastName: string }
interface PlanMini { id: string; name: string; price: string; billingCycle: string }
interface LocationMini { id: string; name: string }

const cycleMonths: Record<string, number> = { MONTHLY: 1, QUARTERLY: 3, ANNUAL: 12, ONE_TIME: 1 };

function KanbanCard({ contract }: { contract: Contract }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: contract.id });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} className={`cursor-grab rounded-lg border border-slate-200 bg-white p-3 shadow-card active:cursor-grabbing ${isDragging ? "opacity-50" : ""}`}>
      <p className="text-sm font-semibold text-ink-900">{contract.member ? `${contract.member.firstName} ${contract.member.lastName}` : contract.title}</p>
      <p className="mt-0.5 text-[11px] text-slate-500">{contract.plan?.name || "No plan"} · {contract.location?.name || "No club"}</p>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-sm font-bold text-accent-700">${Number(contract.monthlyValue).toLocaleString()}/mo</span>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{contract.probability}% · {contract.owner?.name || "unassigned"}</span>
      </div>
    </div>
  );
}

function KanbanColumn({ stage, contracts }: { stage: Stage; contracts: Contract[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const monthly = contracts.reduce((s, d) => s + Number(d.monthlyValue), 0);
  return (
    <div className={`flex w-72 shrink-0 flex-col rounded-xl border p-3 transition ${isOver ? "border-accent-400 bg-accent-50" : "border-slate-200 bg-slate-50"}`}>
      <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-600">{stage.name}</p>
          <p className="text-[10px] text-slate-400">{stage.probability}% close prob</p>
        </div>
        <span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-slate-500 shadow-sm">{contracts.length} · ${Math.round(monthly).toLocaleString()}/mo</span>
      </div>
      <div className="flex flex-1 flex-col gap-2">
        {contracts.map((d) => <KanbanCard key={d.id} contract={d} />)}
        {contracts.length === 0 && <p className="rounded-lg border border-dashed border-slate-200 p-3 text-center text-[10px] text-slate-400">Drop contracts here</p>}
      </div>
    </div>
  );
}

export default function MembershipsPage() {
  const [pipelines, setPipelines] = useState<Pipeline[] | null>(null);
  const [contracts, setContracts] = useState<ContractList | null>(null);
  const [members, setMembers] = useState<MemberMini[]>([]);
  const [plans, setPlans] = useState<PlanMini[]>([]);
  const [locations, setLocations] = useState<LocationMini[]>([]);
  const [pipelineId, setPipelineId] = useState("");
  const [openOnly, setOpenOnly] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ memberId: "", planId: "", locationId: "", title: "", monthlyValue: "", billingCycle: "MONTHLY" });
  const [formError, setFormError] = useState("");

  const loadOptions = async () => {
    try {
      const [m, p, l] = await Promise.all([
        api<{ items: MemberMini[] }>("/members?limit=100"),
        api<PlanMini[]>("/plans"),
        api<{ items: LocationMini[] }>("/locations?limit=50"),
      ]);
      setMembers(m.items);
      setPlans(p.filter((plan) => plan.billingCycle !== "ONE_TIME" || Number(plan.price) > 0));
      setLocations(l.items);
    } catch {
      // options are optional for the board itself
    }
  };

  const loadBoard = async (id: string, onlyOpen: boolean) => {
    setError("");
    try {
      const params = new URLSearchParams({ pipelineId: id, limit: "100" });
      if (onlyOpen) params.set("status", "PENDING");
      setContracts(await api<ContractList>(`/memberships?${params.toString()}`));
    } catch (err: any) {
      setError(err?.message || "Failed to load memberships");
    }
  };

  const load = async () => {
    setError("");
    try {
      const pipelineData = await api<Pipeline[]>("/pipelines");
      setPipelines(pipelineData);
      const id = pipelineId || pipelineData.find((p) => p.isDefault)?.id || pipelineData[0]?.id || "";
      if (!pipelineId) setPipelineId(id);
      if (id) await loadBoard(id, openOnly);
    } catch (err: any) {
      setError(err?.message || "Failed to load pipelines");
    }
  };

  useEffect(() => {
    void load();
    void loadOptions();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (pipelineId) void loadBoard(pipelineId, openOnly);
  }, [pipelineId, openOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  const activePipeline = pipelines?.find((p) => p.id === pipelineId);

  const onDragEnd = async (event: DragEndEvent) => {
    const id = String(event.active.id);
    const stageId = event.over?.id ? String(event.over.id) : null;
    if (!stageId) return;
    const contract = contracts?.items.find((d) => d.id === id);
    if (!contract || contract.stageId === stageId) return;
    try {
      const updated = await api<Contract>(`/memberships/${id}`, { method: "PATCH", body: JSON.stringify({ stageId }) });
      setNotice(
        updated.status === "ACTIVE"
          ? "Membership activated. The member is now active."
          : updated.status === "CANCELLED"
            ? "Membership marked lost."
            : "Stage updated.",
      );
      if (pipelineId) await loadBoard(pipelineId, openOnly);
    } catch (err: any) {
      alert(err?.message || "Failed to move membership");
    }
  };

  const selectPlan = (planId: string) => {
    const plan = plans.find((p) => p.id === planId);
    if (!plan) {
      setForm({ ...form, planId });
      return;
    }
    const months = cycleMonths[plan.billingCycle] ?? 1;
    const monthly = Math.round((Number(plan.price) / months) * 100) / 100;
    const member = members.find((m) => m.id === form.memberId);
    setForm({
      ...form,
      planId,
      monthlyValue: String(monthly),
      billingCycle: plan.billingCycle,
      title: form.title || (member ? `${member.firstName} ${member.lastName} — ${plan.name}` : ""),
    });
  };

  const createContract = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!activePipeline) return;
    const firstStage = activePipeline.stages[0];
    const monthly = Number(form.monthlyValue || 0);
    try {
      await api("/memberships", {
        method: "POST",
        body: JSON.stringify({
          pipelineId,
          stageId: firstStage.id,
          memberId: form.memberId || undefined,
          planId: form.planId || undefined,
          locationId: form.locationId || undefined,
          title: form.title || "New membership",
          value: monthly * 12,
          monthlyValue: monthly,
          billingCycle: form.billingCycle,
          probability: firstStage.probability,
        }),
      });
      setModalOpen(false);
      setForm({ memberId: "", planId: "", locationId: "", title: "", monthlyValue: "", billingCycle: "MONTHLY" });
      await loadBoard(pipelineId, openOnly);
    } catch (err: any) {
      setFormError(err?.message || "Failed to create membership");
    }
  };

  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!pipelines || !contracts) return <LoadingSkeleton rows={4} />;
  if (pipelines.length === 0) return (
    <div className="card flex flex-col items-center gap-3 p-12 text-center">
      <TriangleAlert size={22} className="text-amber-500" />
      <p className="text-sm font-semibold">No pipeline configured</p>
      <p className="max-w-sm text-xs text-slate-500">Create a pipeline with stages to start selling memberships.</p>
      <button className="btn-primary" onClick={() => void api("/pipelines", { method: "POST", body: JSON.stringify({ name: "New Memberships", isDefault: true }) }).then(() => load())}>Create default pipeline</button>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900"><KanbanSquare size={20} /> Membership pipeline</h1>
          <p className="text-xs text-slate-500">
            Weighted contract value: <span className="font-bold text-accent-700">${Math.round(contracts.weightedRevenue).toLocaleString()}</span>
            {openOnly ? " · open contracts only" : ` · ${contracts.total} contracts`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600">
            <input type="checkbox" checked={openOnly} onChange={(e) => setOpenOnly(e.target.checked)} /> Open only
          </label>
          <select className="input" value={pipelineId} onChange={(e) => setPipelineId(e.target.value)} aria-label="Select pipeline">
            {pipelines.map((p) => (<option key={p.id} value={p.id}>{p.name}{p.isDefault ? " (default)" : ""}</option>))}
          </select>
          <button className="btn-primary" onClick={() => setModalOpen(true)}><Plus size={16} /> New membership</button>
        </div>
      </div>

      {notice && <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">{notice}</p>}

      <DndContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {activePipeline?.stages.map((stage) => (
            <KanbanColumn key={stage.id} stage={stage} contracts={contracts.items.filter((d) => d.stageId === stage.id)} />
          ))}
        </div>
      </DndContext>

      <Modal open={modalOpen} title="New membership" onClose={() => setModalOpen(false)}>
        <form onSubmit={createContract} className="space-y-3">
          <FormField label="Member">
            <select className="input" value={form.memberId} onChange={(e) => setForm({ ...form, memberId: e.target.value })}>
              <option value="">No member yet (walk-in offer)</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>)}
            </select>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Plan">
              <select className="input" value={form.planId} onChange={(e) => selectPlan(e.target.value)}>
                <option value="">Custom</option>
                {plans.map((p) => <option key={p.id} value={p.id}>{p.name} · ${Number(p.price)}</option>)}
              </select>
            </FormField>
            <FormField label="Home club">
              <select className="input" value={form.locationId} onChange={(e) => setForm({ ...form, locationId: e.target.value })}>
                <option value="">Unassigned</option>
                {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </FormField>
          </div>
          <FormField label="Contract title"><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="Priya Nair — Unlimited Monthly" /></FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Monthly value ($)"><input className="input" type="number" min="0" value={form.monthlyValue} onChange={(e) => setForm({ ...form, monthlyValue: e.target.value })} required /></FormField>
            <FormField label="Billing cycle">
              <select className="input" value={form.billingCycle} onChange={(e) => setForm({ ...form, billingCycle: e.target.value })}>
                <option>MONTHLY</option><option>QUARTERLY</option><option>ANNUAL</option><option>ONE_TIME</option>
              </select>
            </FormField>
          </div>
          {formError && <p className="text-sm text-rose-600">{formError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary">Create membership</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
