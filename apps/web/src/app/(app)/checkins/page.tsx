"use client";
import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { EmptyState, ErrorState, LoadingSkeleton, Modal, FormField, StatusBadge } from "@/components/ui";
import { Plus, QrCode, Users } from "lucide-react";

interface CheckIn {
  id: string;
  method: string;
  checkedInAt: string;
  durationMinutes: number | null;
  member: { id: string; firstName: string; lastName: string; status: string; email: string | null };
  location: { id: string; name: string };
}
interface CheckInList { items: CheckIn[]; total: number; todayCount: number }
interface MemberMini { id: string; firstName: string; lastName: string; status: string; location?: { id: string; name: string } | null }
interface Location { id: string; name: string }

const today = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
};

export default function CheckInsPage() {
  const [data, setData] = useState<CheckInList | null>(null);
  const [members, setMembers] = useState<MemberMini[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [date, setDate] = useState(today());
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ memberId: "", locationId: "", method: "FRONT_DESK", durationMinutes: "60" });
  const [formError, setFormError] = useState("");

  const load = async () => {
    setError("");
    try {
      setData(await api<CheckInList>(`/checkins?date=${date}&limit=100`));
    } catch (err: any) {
      setError(err?.message || "Failed to load check-ins");
    }
  };

  useEffect(() => {
    void load();
  }, [date]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    Promise.all([api<{ items: MemberMini[] }>("/members?limit=100"), api<{ items: Location[] }>("/locations?limit=50")])
      .then(([m, l]) => {
        setMembers(m.items);
        setLocations(l.items);
      })
      .catch(() => undefined);
  }, []);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");
    try {
      await api("/checkins", {
        method: "POST",
        body: JSON.stringify({
          memberId: form.memberId,
          locationId: form.locationId || undefined,
          method: form.method,
          durationMinutes: form.durationMinutes ? Number(form.durationMinutes) : undefined,
        }),
      });
      setModalOpen(false);
      setForm({ memberId: "", locationId: "", method: "FRONT_DESK", durationMinutes: "60" });
      await load();
    } catch (err: any) {
      setFormError(err?.message || "Check-in failed");
    }
  };

  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!data) return <LoadingSkeleton />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900"><QrCode size={20} /> Check-ins</h1>
          <p className="text-xs text-slate-500">{data.todayCount} today · {data.total} on {date}</p>
        </div>
        <div className="flex items-center gap-2">
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Check-in date" />
          <button className="btn-primary whitespace-nowrap" onClick={() => setModalOpen(true)}><Plus size={16} /> Log check-in</button>
        </div>
      </div>

      {data.items.length === 0 ? (
        <EmptyState title="No check-ins on this date" hint="Front desk, app and QR entries appear here." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">Member</th>
                  <th className="th">Club</th>
                  <th className="th">Time</th>
                  <th className="th">Method</th>
                  <th className="th">Duration</th>
                  <th className="th">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="td">
                      <p className="font-semibold text-slate-800">{c.member.firstName} {c.member.lastName}</p>
                      <p className="text-xs text-slate-500">{c.member.email || "—"}</p>
                    </td>
                    <td className="td text-xs">{c.location.name}</td>
                    <td className="td text-xs">{new Date(c.checkedInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td>
                    <td className="td"><span className="badge bg-slate-100 text-slate-600">{c.method.replaceAll("_", " ")}</span></td>
                    <td className="td text-xs">{c.durationMinutes ? `${c.durationMinutes} min` : "—"}</td>
                    <td className="td"><StatusBadge status={c.member.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-200 px-4 py-3 text-xs text-slate-500">{data.total} entries</div>
        </div>
      )}

      <Modal open={modalOpen} title="Log a check-in" onClose={() => setModalOpen(false)}>
        <form onSubmit={create} className="space-y-3">
          <FormField label="Member">
            <select className="input" value={form.memberId} onChange={(e) => setForm({ ...form, memberId: e.target.value })} required>
              <option value="">Select a member</option>
              {members.map((m) => <option key={m.id} value={m.id} disabled={m.status === "CANCELLED"}>{m.firstName} {m.lastName} · {m.status}</option>)}
            </select>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Club">
              <select className="input" value={form.locationId} onChange={(e) => setForm({ ...form, locationId: e.target.value })}>
                <option value="">Member's home club</option>
                {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </FormField>
            <FormField label="Method">
              <select className="input" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
                <option>FRONT_DESK</option><option>APP</option><option>QR</option>
              </select>
            </FormField>
          </div>
          <FormField label="Session length (minutes)"><input className="input" type="number" min="1" max="600" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} /></FormField>
          {formError && <p className="text-sm text-rose-600">{formError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary"><Users size={15} /> Check in</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
