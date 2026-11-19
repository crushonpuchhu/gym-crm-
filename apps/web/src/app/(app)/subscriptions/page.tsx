"use client";
import { useEffect, useState } from "react";
import { Box, Button, LinearProgress, Typography } from "@mui/material";
import { Stack } from "@/components/mui-stack";
import { api } from "@/lib/api";
import { ErrorState, LoadingSkeleton, PageHeader, Panel, StatusChip } from "@/components/kit";
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

function Quota({ label, used, quota }: { label: string; used: number; quota: number }) {
  const pct = Math.min(100, quota ? (used / quota) * 100 : 0);
  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {label}
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          {pct > 90 ? <StatusChip status="NEAR LIMIT" /> : null}
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {used} / {quota.toLocaleString()}
          </Typography>
        </Stack>
      </Stack>
      <LinearProgress variant="determinate" value={pct} />
    </Box>
  );
}

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

  return (
    <Box sx={{ maxWidth: 1060, mx: "auto" }}>
      <PageHeader
        title="Subscription & entitlements"
        subtitle={`Current plan: ${sub.plan} · ${sub.status}${
          sub.currentPeriodEnd ? ` · renews ${new Date(sub.currentPeriodEnd).toLocaleDateString()}` : ""
        }`}
        actions={<CreditCard size={22} color="#8d8d95" />}
      />

      <Panel>
        <Typography variant="overline" sx={{ color: "text.secondary" }}>
          Quota usage
        </Typography>
        <Box sx={{ mt: 2, display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
          <Quota label="Members" used={usage?.members ?? 0} quota={sub.quotaMembers} />
          <Quota label="Staff seats" used={usage?.staff ?? 0} quota={sub.quotaStaff} />
        </Box>
      </Panel>

      <Box sx={{ mt: 2, display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" } }}>
        {PLANS.map((plan) => {
          const current = sub.plan === plan.name;
          return (
            <Panel
              key={plan.name}
              sx={{
                display: "flex",
                flexDirection: "column",
                p: 3,
                borderColor: current ? "rgba(255,255,255,0.42)" : undefined,
              }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="overline" sx={{ color: "text.secondary" }}>
                  {plan.label}
                </Typography>
                {current ? <StatusChip status="CURRENT" /> : null}
              </Stack>
              <Typography sx={{ mt: 1, fontSize: 32, fontWeight: 700, letterSpacing: "-0.035em" }}>
                {plan.price}
                <Box component="span" sx={{ fontSize: 12, fontWeight: 600, color: "text.disabled" }}>
                  /mo
                </Box>
              </Typography>
              <Typography variant="caption" sx={{ mt: 1, color: "text.secondary" }}>
                {plan.members} · {plan.staff}
              </Typography>
              <Stack spacing={1.1} sx={{ mt: 2.5, flex: 1 }}>
                {plan.features.map((f) => (
                  <Stack key={f} direction="row" spacing={1} alignItems="center">
                    <Check size={13} color="#b9b9c0" />
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      {f}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
              <Button
                variant={current ? "outlined" : "contained"}
                disabled={current || busy}
                onClick={() => void changePlan(plan.name)}
                sx={{ mt: 3 }}
              >
                {current ? "Current plan" : `Switch to ${plan.label}`}
              </Button>
            </Panel>
          );
        })}
      </Box>

      <Typography variant="caption" sx={{ display: "block", textAlign: "center", mt: 2.5, color: "text.disabled" }}>
        Test mode only — no real charges are initiated. Billing provider integration awaits live credentials.
      </Typography>
    </Box>
  );
}
