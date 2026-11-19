"use client";
import { FormEvent, useEffect, useState } from "react";
import { Box, Button, Checkbox, FormControlLabel, MenuItem, TextField, Typography } from "@mui/material";
import { Stack } from "@/components/mui-stack";
import { api } from "@/lib/api";
import { EmptyState, ErrorState, LoadingSkeleton, Modal, PageHeader, Panel } from "@/components/kit";
import { DndContext, DragEndEvent, useDraggable, useDroppable } from "@dnd-kit/core";
import { KanbanSquare, Plus } from "lucide-react";
import { TONES, toneAt } from "@/palette";

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
const CYCLES = ["MONTHLY", "QUARTERLY", "ANNUAL", "ONE_TIME"];
const EMPTY_FORM = { memberId: "", planId: "", locationId: "", title: "", monthlyValue: "", billingCycle: "MONTHLY" };

function KanbanCard({ contract }: { contract: Contract }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: contract.id });
  return (
    <Box
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      sx={{
        cursor: "grab",
        borderRadius: 2,
        border: "1px solid rgba(255,255,255,0.09)",
        backgroundColor: "rgba(255,255,255,0.035)",
        p: 1.5,
        opacity: isDragging ? 0.5 : 1,
        "&:active": { cursor: "grabbing" },
      }}
    >
      <Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>
        {contract.member ? `${contract.member.firstName} ${contract.member.lastName}` : contract.title}
      </Typography>
      <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.25 }}>
        {contract.plan?.name || "No plan"} · {contract.location?.name || "No club"}
      </Typography>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 650 }}>
          ${Number(contract.monthlyValue).toLocaleString()}/mo
        </Typography>
        <Typography variant="caption" sx={{ color: "text.disabled", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {contract.probability}% · {contract.owner?.name || "unassigned"}
        </Typography>
      </Stack>
    </Box>
  );
}

function KanbanColumn({ stage, contracts, index }: { stage: Stage; contracts: Contract[]; index: number }) {
  const accent = TONES[toneAt(index)];
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const monthly = contracts.reduce((s, d) => s + Number(d.monthlyValue), 0);
  return (
    <Box
      ref={setNodeRef}
      sx={{
        display: "flex",
        flexDirection: "column",
        width: 288,
        flexShrink: 0,
        borderRadius: 3,
        border: "1px solid",
        borderColor: isOver ? accent.main : "rgba(255,255,255,0.08)",
        backgroundColor: isOver ? accent.soft : "rgba(255,255,255,0.02)",
        backgroundImage: `linear-gradient(180deg, ${accent.soft}, transparent 32%)`,
        p: 1.5,
        transition: "border-color 150ms, background-color 150ms",
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5, pb: 1.25, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <Box>
          <Stack direction="row" spacing={0.9} alignItems="center">
            <Box sx={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: accent.main, flexShrink: 0 }} />
            <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              {stage.name}
            </Typography>
          </Stack>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {stage.probability}% close prob
          </Typography>
        </Box>
        <Typography
          variant="caption"
          sx={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 999, px: 1, py: 0.4, color: "text.secondary" }}
        >
          {contracts.length} · ${Math.round(monthly).toLocaleString()}/mo
        </Typography>
      </Stack>
      <Stack spacing={1} sx={{ flex: 1 }}>
        {contracts.map((d) => (
          <KanbanCard key={d.id} contract={d} />
        ))}
        {contracts.length === 0 && (
          <Box sx={{ border: "1px dashed rgba(255,255,255,0.12)", borderRadius: 2, p: 1.5, textAlign: "center" }}>
            <Typography variant="caption" sx={{ color: "text.disabled" }}>
              Drop contracts here
            </Typography>
          </Box>
        )}
      </Stack>
    </Box>
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
  const [form, setForm] = useState(EMPTY_FORM);
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
      setForm(EMPTY_FORM);
      await loadBoard(pipelineId, openOnly);
    } catch (err: any) {
      setFormError(err?.message || "Failed to create membership");
    }
  };

  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!pipelines || !contracts) return <LoadingSkeleton rows={4} />;
  if (pipelines.length === 0) {
    return (
      <EmptyState
        title="No pipeline configured"
        hint="Create a pipeline with stages to start selling memberships."
        action={
          <Button
            variant="contained"
            onClick={() => void api("/pipelines", { method: "POST", body: JSON.stringify({ name: "New Memberships", isDefault: true }) }).then(() => load())}
          >
            Create default pipeline
          </Button>
        }
      />
    );
  }

  return (
    <Box>
      <PageHeader
        title="Membership pipeline"
        subtitle={`Weighted contract value: $${Math.round(contracts.weightedRevenue).toLocaleString()}${
          openOnly ? " · open contracts only" : ` · ${contracts.total} contracts`
        }`}
        actions={
          <>
            <FormControlLabel
              control={<Checkbox size="small" checked={openOnly} onChange={(e) => setOpenOnly(e.target.checked)} />}
              label="Open only"
              sx={{ mr: 0 }}
            />
            <TextField
              select
              size="small"
              value={pipelineId}
              onChange={(e) => setPipelineId(e.target.value)}
              slotProps={{ htmlInput: { "aria-label": "Select pipeline" } }}
              sx={{ minWidth: 190 }}
            >
              {pipelines.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name}
                  {p.isDefault ? " (default)" : ""}
                </MenuItem>
              ))}
            </TextField>
            <Button variant="contained" startIcon={<Plus size={16} />} onClick={() => setModalOpen(true)}>
              New membership
            </Button>
          </>
        }
      />

      {notice && (
        <Panel sx={{ mb: 2, p: 1.5, borderColor: "rgba(255,255,255,0.16)" }}>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {notice}
          </Typography>
        </Panel>
      )}

      <DndContext onDragEnd={onDragEnd}>
        <Box sx={{ display: "flex", gap: 2, overflowX: "auto", pb: 2 }}>
          {activePipeline?.stages.map((stage, index) => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              index={index}
              contracts={contracts.items.filter((d) => d.stageId === stage.id)}
            />
          ))}
        </Box>
      </DndContext>

      <Modal open={modalOpen} title="New membership" onClose={() => setModalOpen(false)}>
        <Box component="form" onSubmit={createContract}>
          <Stack spacing={2}>
            <TextField select label="Member" size="small" value={form.memberId} onChange={(e) => setForm({ ...form, memberId: e.target.value })}>
              <MenuItem value="">No member yet (walk-in offer)</MenuItem>
              {members.map((m) => (
                <MenuItem key={m.id} value={m.id}>
                  {m.firstName} {m.lastName}
                </MenuItem>
              ))}
            </TextField>
            <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "1fr 1fr" }}>
              <TextField select label="Plan" size="small" value={form.planId} onChange={(e) => selectPlan(e.target.value)}>
                <MenuItem value="">Custom</MenuItem>
                {plans.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.name} · ${Number(p.price)}
                  </MenuItem>
                ))}
              </TextField>
              <TextField select label="Home club" size="small" value={form.locationId} onChange={(e) => setForm({ ...form, locationId: e.target.value })}>
                <MenuItem value="">Unassigned</MenuItem>
                {locations.map((l) => (
                  <MenuItem key={l.id} value={l.id}>
                    {l.name}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
            <TextField required label="Contract title" size="small" placeholder="Priya Nair — Unlimited Monthly" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "1fr 1fr" }}>
              <TextField required label="Monthly value ($)" type="number" size="small" value={form.monthlyValue} onChange={(e) => setForm({ ...form, monthlyValue: e.target.value })} />
              <TextField select label="Billing cycle" size="small" value={form.billingCycle} onChange={(e) => setForm({ ...form, billingCycle: e.target.value })}>
                {CYCLES.map((cycle) => (
                  <MenuItem key={cycle} value={cycle}>
                    {cycle.replaceAll("_", " ")}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
          </Stack>
          {formError && (
            <Typography variant="body2" sx={{ color: "text.secondary", mt: 2 }}>
              {formError}
            </Typography>
          )}
          <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 3 }}>
            <Button variant="outlined" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="contained">
              Create membership
            </Button>
          </Stack>
        </Box>
      </Modal>
    </Box>
  );
}
