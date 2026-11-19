"use client";
import { FormEvent, useEffect, useState } from "react";
import { Box, Button, MenuItem, TextField, Typography } from "@mui/material";
import { Stack } from "@/components/mui-stack";
import { api } from "@/lib/api";
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader, Panel } from "@/components/kit";
import { Plus, Workflow, Zap, ZapOff } from "lucide-react";
import { TONES } from "@/palette";

interface WorkflowItem { id: string; name: string; trigger: string; isActive: boolean; condition: any; actions: any[] }

const TRIGGERS = [
  ["prospect.created", "Prospect created"],
  ["prospect.toured", "Club tour completed"],
  ["prospect.trial_ending", "Trial ending soon"],
  ["membership.created", "Membership created"],
  ["membership.won", "Membership joined"],
  ["membership.cancelled", "Membership cancelled"],
  ["checkin.inactive", "No check-in for N days"],
  ["payment.failed", "Payment failed"],
  ["ticket.created", "Support ticket created"],
  ["ticket.sla_approaching", "Ticket SLA approaching"],
  ["task.overdue", "Task overdue"],
];
const ACTIONS = [
  ["create_task", "Create follow-up task"],
  ["send_email", "Send email notification"],
  ["assign_owner", "Assign to an advisor"],
  ["notify", "Notify the member"],
];
const EMPTY_FORM = { name: "", trigger: "prospect.created", actionType: "create_task", actionValue: "" };

export default function WorkflowsPage() {
  const [items, setItems] = useState<WorkflowItem[] | null>(null);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
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
      setForm(EMPTY_FORM);
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
    <Box sx={{ maxWidth: 940, mx: "auto" }}>
      <PageHeader
        title="Workflow automation"
        subtitle="Trigger → action rules for enquiries, renewals and win-backs"
        actions={
          <Button variant="contained" startIcon={<Plus size={16} />} onClick={() => setShowForm((v) => !v)}>
            New workflow
          </Button>
        }
      />

      {showForm && (
        <Panel sx={{ mb: 2 }}>
          <Box component="form" onSubmit={create}>
            <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
              <TextField required label="Workflow name" size="small" placeholder="Website enquiries get a follow-up" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <TextField select label="Trigger" size="small" value={form.trigger} onChange={(e) => setForm({ ...form, trigger: e.target.value })}>
                {TRIGGERS.map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField select label="Action" size="small" value={form.actionType} onChange={(e) => setForm({ ...form, actionType: e.target.value })}>
                {ACTIONS.map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField label="Action value" size="small" placeholder="e.g. Call within 24h" value={form.actionValue} onChange={(e) => setForm({ ...form, actionValue: e.target.value })} />
            </Box>
            {formError && (
              <Typography variant="body2" sx={{ color: "text.secondary", mt: 2 }}>
                {formError}
              </Typography>
            )}
            <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 2.5 }}>
              <Button variant="outlined" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="contained">
                Create workflow
              </Button>
            </Stack>
          </Box>
        </Panel>
      )}

      {items.length === 0 && <EmptyState title="No workflows" hint="Automate trial follow-ups, dunning and win-back campaigns." />}

      <Stack spacing={1.5}>
        {items.map((w) => (
          <Panel key={w.id} sx={{ display: "flex", alignItems: "center", gap: 2, p: 2 }}>
            <Box
              sx={{
                display: "grid",
                placeItems: "center",
                width: 38,
                height: 38,
                borderRadius: 2,
                backgroundColor: w.isActive ? TONES.emerald.soft : "transparent",
                boxShadow: `inset 0 0 0 1px ${w.isActive ? TONES.emerald.soft : "rgba(140,165,220,0.16)"}`,
                color: w.isActive ? TONES.emerald.main : "text.disabled",
                flexShrink: 0,
              }}
            >
              <Workflow size={18} />
            </Box>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>{w.name}</Typography>
              <Typography variant="caption" sx={{ color: "text.disabled", fontFamily: "Geist Mono, monospace" }}>
                trigger: {w.trigger} · {w.actions?.length ?? 0} actions
              </Typography>
            </Box>
            <Button
              size="small"
              variant="outlined"
              startIcon={w.isActive ? <Zap size={13} /> : <ZapOff size={13} />}
              onClick={() => void toggle(w)}
            >
              {w.isActive ? "Active" : "Paused"}
            </Button>
          </Panel>
        ))}
      </Stack>
    </Box>
  );
}
