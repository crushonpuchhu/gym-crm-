"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { FormField } from "@/components/ui";
import { Dumbbell } from "lucide-react";

const DEMO_ACCOUNTS = [
  { email: "owner@demo.com", label: "Owner" },
  { email: "manager@demo.com", label: "Club manager" },
  { email: "rep@demo.com", label: "Advisor" },
  { email: "supportlead@demo.com", label: "Support lead" },
];

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(email, password);
      router.replace("/dashboard");
    } catch (err: any) {
      setError(err?.message || "Login failed");
    } finally {
      setBusy(false);
    }
  };

  const useDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("password123");
    setError("");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink-950 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-600 text-white"><Dumbbell size={22} /></div>
          <h1 className="text-2xl font-bold text-white">GymFlow</h1>
          <p className="mt-1 text-sm text-slate-400">Member CRM for gym brands · sign in</p>
        </div>
        <form onSubmit={submit} className="card space-y-4 p-6">
          <FormField label="Email">
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="you@yourgym.com" />
          </FormField>
          <FormField label="Password">
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
          </FormField>
          {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}
          <button className="btn-primary w-full" type="submit" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Demo accounts · password123</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => useDemo(account.email)}
                  className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 hover:border-accent-300 hover:text-accent-700"
                >
                  {account.label}
                </button>
              ))}
            </div>
          </div>
          <p className="text-center text-xs text-slate-500">
            New gym brand? <a className="font-semibold text-accent-600 hover:underline" href="/register">Create an account</a>
          </p>
        </form>
      </div>
    </main>
  );
}
