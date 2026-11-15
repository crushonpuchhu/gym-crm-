import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

export function StatCard({ label, value, sub, icon: Icon }: { label: string; value: string | number; sub?: string; icon?: LucideIcon }) {
  return (
    <div className="card flex items-center justify-between gap-4 p-5">
      <div>
        <p className="label">{label}</p>
        <p className="mt-1 text-2xl font-bold tracking-tight text-ink-900">{value}</p>
        {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
      </div>
      {Icon && (
        <div className="rounded-lg bg-accent-50 p-3 text-accent-600">
          <Icon size={22} strokeWidth={2} />
        </div>
      )}
    </div>
  );
}

const statusColors: Record<string, string> = {
  NEW: "bg-sky-100 text-sky-800",
  CONTACTED: "bg-indigo-100 text-indigo-800",
  QUALIFIED: "bg-violet-100 text-violet-800",
  PROPOSAL: "bg-amber-100 text-amber-800",
  NEGOTIATION: "bg-orange-100 text-orange-800",
  CONVERTED: "bg-emerald-100 text-emerald-800",
  DISQUALIFIED: "bg-slate-200 text-slate-600",
  OPEN: "bg-emerald-100 text-emerald-800",
  PENDING: "bg-amber-100 text-amber-800",
  IN_PROGRESS: "bg-sky-100 text-sky-800",
  RESOLVED: "bg-emerald-100 text-emerald-800",
  CLOSED: "bg-slate-200 text-slate-600",
  ACTIVE: "bg-emerald-100 text-emerald-800",
  WON: "bg-emerald-100 text-emerald-800",
  LOST: "bg-rose-100 text-rose-800",
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={`badge ${statusColors[status] || "bg-slate-100 text-slate-600"}`}>{status.replaceAll("_", " ")}</span>;
}

const priorityColors: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-600",
  MEDIUM: "bg-sky-100 text-sky-800",
  HIGH: "bg-orange-100 text-orange-800",
  URGENT: "bg-rose-100 text-rose-800",
};

export function PriorityBadge({ priority }: { priority: string }) {
  return <span className={`badge ${priorityColors[priority] || "bg-slate-100 text-slate-600"}`}>{priority}</span>;
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center justify-center gap-2 p-12 text-center">
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {hint && <p className="max-w-sm text-xs text-slate-500">{hint}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card border-rose-200 bg-rose-50 p-6 text-center">
      <p className="text-sm font-semibold text-rose-700">{message}</p>
      {onRetry && (
        <button className="btn-secondary mt-3" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}

export function LoadingSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="card divide-y divide-slate-100 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex animate-pulse items-center gap-4 py-3">
          <div className="h-8 w-8 rounded-full bg-slate-200" />
          <div className="h-3 flex-1 rounded bg-slate-200" />
          <div className="h-3 w-24 rounded bg-slate-200" />
        </div>
      ))}
    </div>
  );
}

export function Modal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="card max-h-[90vh] w-full max-w-lg overflow-y-auto p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-ink-900">{title}</h2>
          <button onClick={onClose} aria-label="Close dialog" className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function PaginationBar({ page, pages, total, onPage }: { page: number; pages: number; total: number; onPage: (p: number) => void }) {
  return (
    <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
      <span>
        {total} records · page {page} of {pages || 1}
      </span>
      <div className="flex items-center gap-1">
        <button className="btn-secondary !px-2 !py-1" disabled={page <= 1} onClick={() => onPage(page - 1)}>Prev</button>
        <button className="btn-secondary !px-2 !py-1" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</button>
      </div>
    </div>
  );
}

export function FormField({ label, children, error }: { label: string; children: ReactNode; error?: string }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs font-medium text-rose-600">{error}</p>}
    </div>
  );
}
