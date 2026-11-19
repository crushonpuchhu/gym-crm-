"use client";
import { FormEvent, useEffect, useState } from "react";
import { Box, Button, MenuItem, TextField, Typography } from "@mui/material";
import { Stack } from "@/components/mui-stack";
import { api } from "@/lib/api";
import { EmptyState, ErrorState, LoadingSkeleton, Modal, PageHeader, Panel } from "@/components/kit";
import { Archive, BadgeDollarSign, CalendarDays, Plus, Repeat } from "lucide-react";
import { TONES, toneAt } from "@/palette";

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
const CYCLES = ["MONTHLY", "QUARTERLY", "ANNUAL", "ONE_TIME"];
const EMPTY_FORM = { name: "", description: "", price: "", billingCycle: "MONTHLY", durationDays: "30" };

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
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
      setForm(EMPTY_FORM);
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
    <Box>
      <PageHeader
        title="Membership plans"
        subtitle={`${plans.filter((p) => p.isActive).length} active products · ${plans.reduce((s, p) => s + p._count.memberships, 0)} contracts sold`}
        actions={
          <Button variant="contained" startIcon={<Plus size={16} />} onClick={() => setModalOpen(true)}>
            New plan
          </Button>
        }
      />

      {plans.length === 0 && <EmptyState title="No plans yet" hint="Add the products your front desk sells." />}

      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr", lg: "repeat(3, 1fr)" } }}>
        {plans.map((plan, index) => (
          <Panel key={plan.id} sx={{ display: "flex", flexDirection: "column", opacity: plan.isActive ? 1 : 0.6 }}>
            <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
              <Box
                sx={{
                  display: "grid",
                  placeItems: "center",
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  backgroundColor: TONES[toneAt(index)].soft,
                  boxShadow: `inset 0 0 0 1px ${TONES[toneAt(index)].soft}`,
                  color: TONES[toneAt(index)].main,
                }}
              >
                <BadgeDollarSign size={19} />
              </Box>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Button
                  size="small"
                  variant="text"
                  onClick={() => void toggle(plan)}
                  sx={{
                    fontSize: 10.5,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: plan.isActive ? TONES.emerald.main : "text.secondary",
                    "&:hover": { backgroundColor: plan.isActive ? TONES.emerald.soft : undefined },
                  }}
                >
                  {plan.isActive ? "Active" : "Paused"}
                </Button>
                <Button size="small" variant="text" aria-label="Archive plan" onClick={() => void archive(plan)} sx={{ minWidth: 0, px: 1 }}>
                  <Archive size={15} />
                </Button>
              </Stack>
            </Stack>
            <Typography sx={{ mt: 1.5, fontSize: 16, fontWeight: 650 }}>{plan.name}</Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
              {plan.description || "No description"}
            </Typography>
            <Typography sx={{ mt: 1.5, fontSize: 26, fontWeight: 700, letterSpacing: "-0.03em" }}>
              ${Number(plan.price).toLocaleString()}
              <Box component="span" sx={{ ml: 1, fontSize: 11.5, fontWeight: 600, color: "text.disabled" }}>
                {CYCLE_LABEL[plan.billingCycle]}
              </Box>
            </Typography>
            <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ mt: 2, pt: 1.75, borderTop: "1px solid rgba(255,255,255,0.07)", color: "text.secondary" }}>
              <Stack direction="row" spacing={0.75} alignItems="center">
                <CalendarDays size={12} />
                <Typography variant="caption">{plan.durationDays} days</Typography>
              </Stack>
              <Stack direction="row" spacing={0.75} alignItems="center">
                <Repeat size={12} />
                <Typography variant="caption">{plan._count.memberships} contracts</Typography>
              </Stack>
            </Stack>
          </Panel>
        ))}
      </Box>

      <Modal open={modalOpen} title="New membership plan" onClose={() => setModalOpen(false)}>
        <Box component="form" onSubmit={create}>
          <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "1fr 1fr" }}>
            <TextField required label="Plan name" size="small" placeholder="Unlimited Monthly" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <TextField required label="Price ($)" type="number" size="small" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            <TextField select label="Billing cycle" size="small" value={form.billingCycle} onChange={(e) => setForm({ ...form, billingCycle: e.target.value })}>
              {CYCLES.map((cycle) => (
                <MenuItem key={cycle} value={cycle}>
                  {cycle.replaceAll("_", " ")}
                </MenuItem>
              ))}
            </TextField>
            <TextField label="Duration (days)" type="number" size="small" value={form.durationDays} onChange={(e) => setForm({ ...form, durationDays: e.target.value })} />
            <TextField
              label="Description"
              size="small"
              placeholder="All clubs and group classes"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              sx={{ gridColumn: "span 2" }}
            />
          </Box>
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
              Create plan
            </Button>
          </Stack>
        </Box>
      </Modal>
    </Box>
  );
}
