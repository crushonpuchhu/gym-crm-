"use client";
import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ErrorState, LoadingSkeleton, Modal, FormField, PriorityBadge } from "@/components/ui";
import { DndContext, DragEndEvent, useDraggable, useDroppable } from "@dnd-kit/core";
import { KanbanSquare, Plus, TriangleAlert } from "lucide-react";

interface Stage { id: string; name: string; order: number; probability: number; isWon: boolean; isLost: boolean }
interface Pipeline { id: string; name: string; isDefault: boolean; stages: Stage[] }
interface Deal { id: string; title: string; value: string; probability: number; stageId: string; contact?: { firstName: string; lastName: string } | null; company?: { name: string } | null; owner?: { name: string } | null }
interface DealList { items: Deal[]; weightedRevenue: number }

function KanbanCard({ deal }: { deal: Deal }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: deal.id });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} className={`cursor-grab rounded-lg border border-slate-200 bg-white p-3 shadow-card active:cursor-grabbing ${isDragging ? "opacity-50" : ""}`}>
      <p className="text-sm font-semibold text-ink-900">{deal.title}</p>
      <p className="mt-1 text-xs text-slate-500">{deal.company?.name || (deal.contact ? `${deal.contact.firstName} ${deal.contact.lastName}` : "No account")}</p>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-sm font-bold text-accent-700">${Number(deal.value).toLocaleString()}</span>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{deal.probability}% · {deal.owner?.name || "unassigned"}</span>
      </div>
    </div>
  );
}

function KanbanColumn({ stage, deals }: { stage: Stage; deals: Deal[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const total = deals.reduce((s, d) => s + Number(d.value), 0);
  return (
    <div className={`flex w-72 shrink-0 flex-col rounded-xl border p-3 transition ${isOver ? "border-accent-400 bg-accent-50" : "border-slate-200 bg-slate-50"}`}>
      <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-600">{stage.name}</p>
          <p className="text-[10px] text-slate-400">{stage.probability}% win prob</p>
        </div>
        <span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-slate-500 shadow-sm">{deals.length} · ${Math.round(total).toLocaleString()}</span>
      </div>
      <div className="flex flex-1 flex-col gap-2">
        {deals.map((d) => <KanbanCard key={d.id} deal={d} />)}
        {deals.length === 0 && <p className="rounded-lg border border-dashed border-slate-200 p-3 text-center text-[10px] text-slate-400">Drop deals here</p>}
      </div>
    </div>
  );
}

export default function DealsPage() {
  const [pipelines, setPipelines] = useState<Pipeline[] | null>(null);
  const [deals, setDeals] = useState<DealList | null>(null);
  const [pipelineId, setPipelineId] = useState("");
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ title: "", value: "", probability: "10", expectedCloseAt: "" });
  const [formError, setFormError] = useState("");

  const load = async () => {
    setError("");
    try {
      const pipelinesData = await api<Pipeline[]>("/pipelines");
      setPipelines(pipelinesData);
      const id = pipelineId || pipelinesData.find((p) => p.isDefault)?.id || pipelinesData[0]?.id || "";
      if (!pipelineId) setPipelineId(id);
      if (id) setDeals(await api<DealList>(`/deals?pipelineId=${id}&limit=100`));
    } catch (err: any) {
      setError(err?.message || "Failed to load pipeline");
    }
  };

  useEffect(() => {
    void load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const activePipeline = pipelines?.find((p) => p.id === pipelineId);

  const onDragEnd = async (event: DragEndEvent) => {
    const dealId = String(event.active.id);
    const stageId = event.over?.id ? String(event.over.id) : null;
    if (!stageId) return;
    const deal = deals?.items.find((d) => d.id === dealId);
    if (!deal || deal.stageId === stageId) return;
    try {
      await api(`/deals/${dealId}`, { method: "PATCH", body: JSON.stringify({ stageId }) });
      if (pipelineId) setDeals(await api<DealList>(`/deals?pipelineId=${pipelineId}&limit=100`));
    } catch (err: any) {
      alert(err?.message || "Failed to move deal");
    }
  };

  const createDeal = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!activePipeline) return;
    const firstStage = activePipeline.stages[0];
    try {
      await api("/deals", {
        method: "POST",
        body: JSON.stringify({ pipelineId, stageId: firstStage.id, title: form.title, value: Number(form.value), probability: Number(form.probability), expectedCloseAt: form.expectedCloseAt ? new Date(form.expectedCloseAt).toISOString() : undefined }),
      });
      setModalOpen(false);
      setForm({ title: "", value: "", probability: "10", expectedCloseAt: "" });
      await load();
    } catch (err: any) {
      setFormError(err?.message || "Failed to create deal");
    }
  };

  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!pipelines || !deals) return <LoadingSkeleton rows={4} />;
  if (pipelines.length === 0) return (
    <div className="card flex flex-col items-center gap-3 p-12 text-center">
      <TriangleAlert size={22} className="text-amber-500" />
      <p className="text-sm font-semibold">No pipeline configured</p>
      <p className="max-w-sm text-xs text-slate-500">Create a pipeline with stages to start managing deals.</p>
      <button className="btn-primary" onClick={() => void api("/pipelines", { method: "POST", body: JSON.stringify({ name: "Sales Pipeline", isDefault: true }) }).then(() => load())}>Create default pipeline</button>
    </div>
  );

  const weighted = deals.weightedRevenue;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink-900">Sales Pipeline</h1>
          <p className="text-xs text-slate-500">Weighted revenue: <span className="font-bold text-accent-700">${weighted.toLocaleString()}</span></p>
        </div>
        <div className="flex items-center gap-2">
          <select className="input" value={pipelineId} onChange={(e) => setPipelineId(e.target.value)} aria-label="Select pipeline">
            {pipelines.map((p) => (<option key={p.id} value={p.id}>{p.name}{p.isDefault ? " (default)" : ""}</option>))}
          </select>
          <button className="btn-primary" onClick={() => setModalOpen(true)}><Plus size={16} /> New deal</button>
        </div>
      </div>

      <DndContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {activePipeline?.stages.map((stage) => (
            <KanbanColumn key={stage.id} stage={stage} deals={deals.items.filter((d) => d.stageId === stage.id)} />
          ))}
        </div>
      </DndContext>

      <Modal open={modalOpen} title="New deal" onClose={() => setModalOpen(false)}>
        <form onSubmit={createDeal} className="space-y-3">
          <FormField label="Deal title"><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Value ($)"><input className="input" type="number" min="0" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} required /></FormField>
            <FormField label="Probability %"><input className="input" type="number" min="0" max="100" value={form.probability} onChange={(e) => setForm({ ...form, probability: e.target.value })} /></FormField>
          </div>
          <FormField label="Expected close"><input className="input" type="date" value={form.expectedCloseAt} onChange={(e) => setForm({ ...form, expectedCloseAt: e.target.value })} /></FormField>
          {formError && <p className="text-sm text-rose-600">{formError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary">Create deal</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
