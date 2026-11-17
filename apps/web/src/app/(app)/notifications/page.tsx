"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/ui";
import { Bell, CheckCheck } from "lucide-react";

interface NotificationItem { id: string; type: string; title: string; body: string; readAt: string | null; createdAt: string }
interface NotificationResponse { items: NotificationItem[]; unread: number }

export default function NotificationsPage() {
  const [data, setData] = useState<NotificationResponse | null>(null);
  const [error, setError] = useState("");

  const load = async () => {
    setError("");
    try {
      setData(await api<NotificationResponse>("/notifications"));
    } catch (err: any) {
      setError(err?.message || "Failed to load notifications");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const markAllRead = async () => {
    try {
      await api("/notifications/read-all", { method: "PATCH" });
      await load();
    } catch (err: any) {
      alert(err?.message || "Failed to mark read");
    }
  };

  const markRead = async (id: string) => {
    try {
      await api(`/notifications/${id}/read`, { method: "PATCH" });
      await load();
    } catch {
      /* non-fatal */
    }
  };

  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!data) return <LoadingSkeleton />;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900"><Bell size={18} /> Notifications</h1>
          <p className="text-xs text-slate-500">{data.unread} unread</p>
        </div>
        {data.unread > 0 && <button className="btn-secondary !text-xs" onClick={() => void markAllRead()}><CheckCheck size={14} /> Mark all read</button>}
      </div>
      {data.items.length === 0 && <EmptyState title="No notifications" hint="Trial reminders, renewals and ticket updates will appear here." />}
      <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {data.items.map((n) => (
          <button key={n.id} onClick={() => void markRead(n.id)} className={`flex w-full items-start gap-3 p-4 text-left transition hover:bg-slate-50 ${n.readAt ? "opacity-60" : "bg-accent-50/40"}`}>
            <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${n.readAt ? "bg-slate-200" : "bg-accent-500"}`} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800">{n.title}</p>
              <p className="text-xs text-slate-500">{n.body}</p>
              <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-400">{new Date(n.createdAt).toLocaleString()}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
