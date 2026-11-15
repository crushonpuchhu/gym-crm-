"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { LoadingSkeleton, ErrorState } from "@/components/ui";
import { Check, CreditCard } from "lucide-react";

interface Subscription { plan: string; status: string; quotaLeads: number; quotaUsers: number; currentPeriodEnd?: string | null }

const PLANS = [
  { name: "FREE", price: "$0", leads: "1,000 leads", users: "5 users", features: ["Core CRM", "Pipeline", "Ticketing"] },
  { name: "PROFESSIONAL", price: "$49", leads: "10,000 leads", users: "25 users", features: ["Everything in Free", "Automation", "Analytics", "Integrations"] },
  { name: "ENTERPRISE", price: "$199", leads: "Unlimited leads", users: "100 users", features: ["Everything in Pro", "SSO/SAML", "Dedicated support", "Audit exports"] },
];

export default function SubscriptionsPage() {
  const [sub, setSub] = useState<Subscription | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setError("");
    try {
      setSub(await api<Subscription>("/subscriptions"));
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

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink-900">Subscription & entitlements</h1>
          <p className="text-xs text-slate-500">Current plan: <span className="font-bold text-accent-700">{sub.plan}</span> · {sub.status} · {sub.quotaLeads.toLocaleString()} lead quota · {sub.quotaUsers} seats</p>
        </div>
        <CreditCard size={22} className="text-slate-400" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {PLANS.map((plan) => {
          const current = sub.plan === plan.name;
          return (
            <div key={plan.name} className={`card flex flex-col p-6 ${current ? "ring-2 ring-accent-500" : ""}`}>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{plan.name}</p>
              <p className="mt-2 text-3xl font-black text-ink-900">{plan.price}<span className="text-sm font-semibold text-slate-400">/mo</span></p>
              <p className="mt-3 text-xs text-slate-500">{plan.leads} · {plan.users}</p>
              <ul className="mt-4 flex-1 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-slate-600"><Check size={13} className="text-emerald-500" /> {f}</li>
                ))}
              </ul>
              <button className={current ? "btn-secondary mt-5" : "btn-primary mt-5"} disabled={current || busy} onClick={() => void changePlan(plan.name)}>
                {current ? "Current plan" : `Switch to ${plan.name}`}
              </button>
            </div>
          );
        })}
      </div>
      <p className="text-center text-[10px] text-slate-400">Test mode only — no real charges are initiated. Billing provider integration awaits live credentials.</p>
    </div>
  );
}
