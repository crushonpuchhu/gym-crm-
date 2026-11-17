"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { LoadingSkeleton, ErrorState } from "@/components/ui";
import { Check, CreditCard } from "lucide-react";

interface Subscription { plan: string; status: string; quotaMembers: number; quotaStaff: number; currentPeriodEnd?: string | null }
interface Usage { members: number; staff: number }

const PLANS = [
  {
    name: "STARTER",
    label: "Starter",
    price: "$29",
    members: "500 members",
    staff: "5 staff",
    features: ["One club", "Members & memberships", "Front-desk check-ins", "Email support"],
  },
  {
    name: "GROWTH",
    label: "Growth",
    price: "$99",
    members: "5,000 members",
    staff: "25 staff",
    features: ["Unlimited clubs", "Automations & workflows", "Retention reporting", "Priority support"],
  },
  {
    name: "SCALE",
    label: "Scale",
    price: "$299",
    members: "100,000 members",
    staff: "200 staff",
    features: ["Everything in Growth", "SSO/SAML", "Audit exports", "Dedicated success manager"],
  },
];

export default function SubscriptionsPage() {
  const [sub, setSub] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setError("");
    try {
      const [subscription, stats, users] = await Promise.all([
        api<Subscription>("/subscriptions"),
        api<{ totalMembers: number }>("/reports/dashboard").catch(() => ({ totalMembers: 0 })),
        api<unknown[]>("/users").catch(() => []),
      ]);
      setSub(subscription);
      setUsage({ members: stats.totalMembers, staff: Array.isArray(users) ? users.length : 0 });
    } catch (err: any) {
      setError(err?.message || "Failed to load subscription");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const changePlan = async (plan: string) => {
    setBusy(true);
    try {
      const updated = await api<Subscription>(`/subscriptions/${plan}`, { method: "POST" });
      setSub(updated);
    } catch (err: any) {
      alert(err?.message || "Failed to change plan");
    } finally {
      setBusy(false);
    }
  };

  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!sub) return <LoadingSkeleton rows={3} />;

  const memberPct = Math.min(100, sub.quotaMembers ? ((usage?.members ?? 0) / sub.quotaMembers) * 100 : 0);
  const staffPct = Math.min(100, sub.quotaStaff ? ((usage?.staff ?? 0) / sub.quotaStaff) * 100 : 0);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink-900">Subscription & entitlements</h1>
          <p className="text-xs text-slate-500">
            Current plan: <span className="font-bold text-accent-700">{sub.plan}</span> · {sub.status}
            {sub.currentPeriodEnd ? ` · renews ${new Date(sub.currentPeriodEnd).toLocaleDateString()}` : ""}
          </p>
        </div>
        <CreditCard size={22} className="text-slate-400" />
      </div>

      <div className="card p-5">
        <p className="label">Quota usage</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">Members</span>
              <span className="text-slate-500">{usage?.members ?? 0} / {sub.quotaMembers.toLocaleString()}</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full rounded-full ${memberPct > 90 ? "bg-rose-500" : "bg-accent-500"}`} style={{ width: `${memberPct}%` }} />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">Staff seats</span>
              <span className="text-slate-500">{usage?.staff ?? 0} / {sub.quotaStaff.toLocaleString()}</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full rounded-full ${staffPct > 90 ? "bg-rose-500" : "bg-accent-500"}`} style={{ width: `${staffPct}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {PLANS.map((plan) => {
          const current = sub.plan === plan.name;
          return (
            <div key={plan.name} className={`card flex flex-col p-6 ${current ? "ring-2 ring-accent-500" : ""}`}>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{plan.label}</p>
              <p className="mt-2 text-3xl font-black text-ink-900">{plan.price}<span className="text-sm font-semibold text-slate-400">/mo</span></p>
              <p className="mt-3 text-xs text-slate-500">{plan.members} · {plan.staff}</p>
              <ul className="mt-4 flex-1 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-slate-600"><Check size={13} className="text-emerald-500" /> {f}</li>
                ))}
              </ul>
              <button className={current ? "btn-secondary mt-5" : "btn-primary mt-5"} disabled={current || busy} onClick={() => void changePlan(plan.name)}>
                {current ? "Current plan" : `Switch to ${plan.label}`}
              </button>
            </div>
          );
        })}
      </div>
      <p className="text-center text-[10px] text-slate-400">Test mode only — no real charges are initiated. Billing provider integration awaits live credentials.</p>
    </div>
  );
}
