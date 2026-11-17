"use client";
import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { EmptyState, ErrorState, LoadingSkeleton, Modal, FormField, PaginationBar } from "@/components/ui";
import { Plus, Trash2, Users, QrCode, DoorOpen } from "lucide-react";

interface LocationRow {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  region: string | null;
  phone: string | null;
  capacity: number | null;
  opensAt: string | null;
  closesAt: string | null;
  isActive: boolean;
  _count: { members: number; checkIns: number; memberships: number };
}
interface LocationList { items: LocationRow[]; total: number; page: number; pages: number }

export default function LocationsPage() {
  const [data, setData] = useState<LocationList | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: "", address: "", city: "", region: "", phone: "", capacity: "", opensAt: "06:00", closesAt: "22:00" });
  const [formError, setFormError] = useState("");

  const load = async () => {
    setError("");
    try {
      setData(await api<LocationList>(`/locations?page=${page}&limit=15`));
    } catch (err: any) {
      setError(err?.message || "Failed to load clubs");
    }
  };

  useEffect(() => {
    void load();
  }, [page]);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");
    try {
      await api("/locations", { method: "POST", body: JSON.stringify({ ...form, capacity: form.capacity ? Number(form.capacity) : undefined }) });
      setModalOpen(false);
      setForm({ name: "", address: "", city: "", region: "", phone: "", capacity: "", opensAt: "06:00", closesAt: "22:00" });
      await load();
    } catch (err: any) {
      setFormError(err?.message || "Failed to create club");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Archive this club? Members must be moved first.")) return;
    try {
      await api(`/locations/${id}`, { method: "DELETE" });
      await load();
    } catch (err: any) {
      alert(err?.message || "Delete failed");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink-900">Clubs</h1>
          <p className="text-xs text-slate-500">{data?.total ?? 0} locations in this gym brand</p>
        </div>
        <button className="btn-primary" onClick={() => setModalOpen(true)}><Plus size={16} /> New club</button>
      </div>
      {error && <ErrorState message={error} onRetry={() => void load()} />}
      {!data && !error && <LoadingSkeleton />}
      {data && data.items.length === 0 && <EmptyState title="No clubs yet" hint="Add the first location to start assigning members." />}
      {data && data.items.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.items.map((co) => (
            <div key={co.id} className="card flex flex-col p-5">
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent-50 text-lg font-black text-accent-600">{co.name.slice(0, 1).toUpperCase()}</div>
                <button className="rounded-lg p-2 text-rose-500 hover:bg-rose-50" onClick={() => void remove(co.id)} aria-label="Archive club"><Trash2 size={16} /></button>
              </div>
              <p className="mt-3 text-base font-bold text-ink-900">{co.name}</p>
              <p className="text-xs text-slate-500">{co.address || "No address"}{co.city ? ` · ${co.city}${co.region ? `, ${co.region}` : ""}` : ""}</p>
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                <DoorOpen size={13} /> {co.opensAt || "—"}–{co.closesAt || "—"}
                {co.phone ? <span className="ml-auto">{co.phone}</span> : null}
              </div>
              <div className="mt-4 flex flex-wrap gap-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1"><Users size={12} /> {co._count.members} members{co.capacity ? ` / ${co.capacity}` : ""}</span>
                <span className="inline-flex items-center gap-1"><QrCode size={12} /> {co._count.checkIns} check-ins</span>
                <span>{co._count.memberships} contracts</span>
              </div>
            </div>
          ))}
        </div>
      )}
      {data && <PaginationBar page={data.page} pages={data.pages} total={data.total} onPage={setPage} />}
      <Modal open={modalOpen} title="New club" onClose={() => setModalOpen(false)}>
        <form onSubmit={create} className="grid grid-cols-2 gap-3">
          <FormField label="Club name"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></FormField>
          <FormField label="Phone"><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></FormField>
          <FormField label="Address"><input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></FormField>
          <FormField label="City"><input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></FormField>
          <FormField label="Region"><input className="input" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} /></FormField>
          <FormField label="Capacity"><input className="input" type="number" min="0" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} /></FormField>
          <FormField label="Opens at"><input className="input" type="time" value={form.opensAt} onChange={(e) => setForm({ ...form, opensAt: e.target.value })} /></FormField>
          <FormField label="Closes at"><input className="input" type="time" value={form.closesAt} onChange={(e) => setForm({ ...form, closesAt: e.target.value })} /></FormField>
          {formError && <p className="col-span-2 text-sm text-rose-600">{formError}</p>}
          <div className="col-span-2 flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary">Create club</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
