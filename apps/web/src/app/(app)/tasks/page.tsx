"use client";
import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { EmptyState, ErrorState, LoadingSkeleton, Modal, FormField } from "@/components/ui";
import { CheckSquare, Plus, Circle, CheckCircle2 } from "lucide-react";

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
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink-900">Tasks & follow-ups</h1>
          <p className="text-xs text-slate-500">{pending} open · {tasks.length} total</p>
        </div>
        <button className="btn-primary" onClick={() => setModalOpen(true)}><Plus size={16} /> New task</button>
      </div>
      {tasks.length === 0 && <EmptyState title="All clear" hint="Create follow-up tasks for tours, trials and renewals." />}
      <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {tasks.map((t) => (
          <div key={t.id} className="flex items-center gap-3 p-4 transition hover:bg-slate-50">
            <button onClick={() => void toggle(t)} className="text-slate-400 hover:text-accent-600" aria-label="Toggle complete">
              {t.status === "COMPLETED" ? <CheckCircle2 size={20} className="text-emerald-500" /> : <Circle size={20} />}
            </button>
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-medium ${t.status === "COMPLETED" ? "text-slate-400 line-through" : "text-slate-800"}`}>{t.title}</p>
              <p className="text-[10px] uppercase tracking-wide text-slate-400">{t.type}{t.dueAt ? ` · due ${new Date(t.dueAt).toLocaleDateString()}` : ""}</p>
            </div>
          </div>
        ))}
      </div>
      <Modal open={modalOpen} title="New task" onClose={() => setModalOpen(false)}>
        <form onSubmit={create} className="space-y-3">
          <FormField label="Title"><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="Follow up with Acme about the proposal" /></FormField>
          <FormField label="Assignee (user id, optional)"><input className="input" value={form.ownerId} onChange={(e) => setForm({ ...form, ownerId: e.target.value })} /></FormField>
          <FormField label="Due date"><input className="input" type="datetime-local" value={form.dueAt} onChange={(e) => setForm({ ...form, dueAt: e.target.value })} /></FormField>
          {formError && <p className="text-sm text-rose-600">{formError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary">Create task</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
