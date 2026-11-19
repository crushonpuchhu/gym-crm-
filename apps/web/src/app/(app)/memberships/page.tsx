"use client";
import { FormEvent, useEffect, useState } from "react";
import { Box, Button, Checkbox, FormControlLabel, MenuItem, TextField, Typography } from "@mui/material";
import { Stack } from "@/components/mui-stack";
import { api } from "@/lib/api";
import { EmptyState, ErrorState, LoadingSkeleton, Modal, PageHeader, Panel } from "@/components/kit";
import { Plus } from "lucide-react";
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
  const [movingId, setMovingId] = useState("");

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

  const moveContract = async (id: string, stageId: string) => {
    const contract = contracts?.items.find((d) => d.id === id);
    if (!contract || contract.stageId === stageId) return;
    setMovingId(id);
    setNotice("");
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
      setNotice(err?.message || "Failed to move membership");
    } finally {
      setMovingId("");
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
        <Panel sx={{ mb: 2, p: 1.5, borderColor: "rgba(75,124,242,0.35)" }}>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {notice}
          </Typography>
        </Panel>
      )}

      <Box sx={{ display: "flex", gap: 2, overflowX: "auto", pb: 2 }}>
        {activePipeline?.stages.map((stage, index) => (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            index={index}
            stages={activePipeline.stages}
            contracts={contracts.items.filter((d) => d.stageId === stage.id)}
            onMove={moveContract}
            movingId={movingId}
          />
        ))}
      </Box>

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

function KanbanCard({
  contract,
  stages,
  onMove,
  moving,
}: {
  contract: Contract;
  stages: Stage[];
  onMove: (id: string, stageId: string) => void;
  moving: boolean;
}) {
  return (
    <Box
      sx={{
        borderRadius: 2,
        border: "1px solid var(--gf-border)",
        backgroundColor: "background.paper",
        boxShadow: "0 1px 2px rgba(10, 20, 40, 0.04)",
        p: 1.5,
        opacity: moving ? 0.55 : 1,
        pointerEvents: moving ? "none" : "auto",
        transition: "opacity 150ms",
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
        <Typography variant="caption" sx={{ color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {contract.probability}% · {contract.owner?.name || "unassigned"}
        </Typography>
      </Stack>
      <TextField
        select
        size="small"
        fullWidth
        label="Stage"
        value={contract.stageId}
        disabled={moving}
        onChange={(e) => onMove(contract.id, e.target.value)}
        slotProps={{ htmlInput: { "aria-label": `Move ${contract.title} to another stage` } }}
        sx={{
          mt: 1.25,
          "& .MuiOutlinedInput-root": { backgroundColor: "action.hover" },
          "& .MuiInputLabel-root": { fontSize: 11 },
        }}
      >
        {stages.map((s) => (
          <MenuItem key={s.id} value={s.id} sx={{ fontSize: 13 }}>
            {s.name}
          </MenuItem>
        ))}
      </TextField>
    </Box>
  );
}

function KanbanColumn({
  stage,
  contracts,
  index,
  stages,
  onMove,
  movingId,
}: {
  stage: Stage;
  contracts: Contract[];
  index: number;
  stages: Stage[];
  onMove: (id: string, stageId: string) => void;
  movingId: string;
}) {
  const accent = TONES[toneAt(index)];
  const monthly = contracts.reduce((s, d) => s + Number(d.monthlyValue), 0);
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        width: 288,
        flexShrink: 0,
        borderRadius: 3,
        border: "1px solid var(--gf-border)",
        backgroundColor: "action.hover",
        backgroundImage: `linear-gradient(180deg, ${accent.soft}, transparent 26%)`,
        p: 1.5,
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5, pb: 1.25, borderBottom: "1px solid var(--gf-border)" }}>
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
          sx={{ border: "1px solid var(--gf-border)", borderRadius: 999, px: 1, py: 0.4, color: "text.secondary" }}
        >
          {contracts.length} · ${Math.round(monthly).toLocaleString()}/mo
        </Typography>
      </Stack>
      <Stack spacing={1} sx={{ flex: 1 }}>
        {contracts.map((d) => (
          <KanbanCard
            key={d.id}
            contract={d}
            stages={stages}
            onMove={onMove}
            moving={movingId === d.id}
          />
        ))}
        {contracts.length === 0 && (
          <Box sx={{ border: "1px dashed var(--gf-border)", borderRadius: 2, p: 1.5, textAlign: "center" }}>
            <Typography variant="caption" sx={{ color: "text.disabled" }}>
              No contracts at this stage
            </Typography>
          </Box>
        )}
      </Stack>
    </Box>
  );
}
