"use client";
import { FormEvent, useEffect, useState } from "react";
import { Box, Button, IconButton, TextField, Typography } from "@mui/material";
import { Stack } from "@/components/mui-stack";
import { api } from "@/lib/api";
import { EmptyState, ErrorState, LoadingSkeleton, Modal, PageHeader, Panel, StatusChip } from "@/components/kit";
import { CheckCircle2, Circle, Plus } from "lucide-react";
import { TONES } from "@/palette";

interface Task { id: string; title: string; type: string; ownerId: string; dueAt: string | null; status: string; }

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ title: "", ownerId: "", dueAt: "" });
  const [formError, setFormError] = useState("");

  const load = async () => {
    setError("");
    try {
      setTasks(await api<Task[]>("/tasks"));
    } catch (err: any) {
      setError(err?.message || "Failed to load tasks");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const toggle = async (t: Task) => {
    try {
      await api(`/tasks/${t.id}`, { method: "PATCH", body: JSON.stringify({ status: t.status === "COMPLETED" ? "OPEN" : "COMPLETED" }) });
      await load();
    } catch (err: any) {
      alert(err?.message || "Update failed");
    }
  };

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");
    try {
      await api("/tasks", { method: "POST", body: JSON.stringify({ ...form, ownerId: form.ownerId || undefined, dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : undefined }) });
      setModalOpen(false);
      setForm({ title: "", ownerId: "", dueAt: "" });
      await load();
    } catch (err: any) {
      setFormError(err?.message || "Failed to create task");
    }
  };

  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!tasks) return <LoadingSkeleton />;

  const pending = tasks.filter((t) => t.status !== "COMPLETED").length;

  return (
    <Box sx={{ maxWidth: 780, mx: "auto" }}>
      <PageHeader
        title="Tasks & follow-ups"
        subtitle={`${pending} open · ${tasks.length} total`}
        actions={
          <Button variant="contained" startIcon={<Plus size={16} />} onClick={() => setModalOpen(true)}>
            New task
          </Button>
        }
      />

      {tasks.length === 0 && <EmptyState title="All clear" hint="Create follow-up tasks for tours, trials and renewals." />}

      {tasks.length > 0 && (
        <Panel padded={false} sx={{ overflow: "hidden" }}>
          {tasks.map((t) => {
            const done = t.status === "COMPLETED";
            return (
              <Stack
                key={t.id}
                direction="row"
                alignItems="center"
                spacing={1.5}
                sx={{
                  px: 2,
                  py: 1.75,
                  borderBottom: "1px solid var(--gf-border)",
                  "&:last-of-type": { borderBottom: "none" },
                  "&:hover": { backgroundColor: "var(--gf-wash)" },
                }}
              >
                <IconButton
                  aria-label="Toggle complete"
                  onClick={() => void toggle(t)}
                  sx={{ color: done ? TONES.emerald.main : "text.disabled" }}
                >
                  {done ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                </IconButton>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography
                    sx={{
                      fontSize: 13.5,
                      fontWeight: 550,
                      color: done ? "text.disabled" : "text.primary",
                      textDecoration: done ? "line-through" : "none",
                    }}
                  >
                    {t.title}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.disabled", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    {t.type}
                    {t.dueAt ? ` · due ${new Date(t.dueAt).toLocaleDateString()}` : ""}
                  </Typography>
                </Box>
                <StatusChip status={t.status} />
              </Stack>
            );
          })}
        </Panel>
      )}

      <Modal open={modalOpen} title="New task" onClose={() => setModalOpen(false)}>
        <Box component="form" onSubmit={create}>
          <Stack spacing={2}>
            <TextField required label="Title" size="small" placeholder="Follow up with a member about renewal" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <TextField label="Assignee (user id, optional)" size="small" value={form.ownerId} onChange={(e) => setForm({ ...form, ownerId: e.target.value })} />
            <TextField
              label="Due date"
              type="datetime-local"
              size="small"
              value={form.dueAt}
              onChange={(e) => setForm({ ...form, dueAt: e.target.value })}
              slotProps={{ inputLabel: { shrink: true } }}
            />
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
              Create task
            </Button>
          </Stack>
        </Box>
      </Modal>
    </Box>
  );
}
