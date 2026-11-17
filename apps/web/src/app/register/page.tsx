"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { FormField } from "@/components/ui";
import { Dumbbell } from "lucide-react";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "", name: "", organizationName: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await register(form);
      router.replace("/dashboard");
    } catch (err: any) {
      setError(err?.message || "Registration failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink-950 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-600 text-white"><Dumbbell size={22} /></div>
          <h1 className="text-2xl font-bold text-white">GymFlow</h1>
          <p className="mt-1 text-sm text-slate-400">Set up your gym brand workspace</p>
        </div>
        <form onSubmit={submit} className="card space-y-4 p-6">
          <FormField label="Gym brand name">
            <input className="input" value={form.organizationName} onChange={(e) => setForm({ ...form, organizationName: e.target.value })} required />
          </FormField>
          <FormField label="Your name">
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </FormField>
          <FormField label="Email">
            <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </FormField>
          <FormField label="Password (min 8 characters)">
            <input className="input" type="password" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          </FormField>
          {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}
          <button className="btn-primary w-full" type="submit" disabled={busy}>
            {busy ? "Creating…" : "Create gym workspace"}
          </button>
          <p className="text-center text-xs text-slate-500">
            Have an account? <a className="font-semibold text-accent-600 hover:underline" href="/login">Sign in</a>
          </p>
        </form>
      </div>
    </main>
  );
}
