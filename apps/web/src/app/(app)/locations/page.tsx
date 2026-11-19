"use client";
import { FormEvent, useEffect, useState } from "react";
import { Box, Button, IconButton, TextField, Tooltip, Typography } from "@mui/material";
import { Stack } from "@/components/mui-stack";
import { api } from "@/lib/api";
import { EmptyState, ErrorState, LoadingSkeleton, Modal, PageHeader, PaginationBar, Panel } from "@/components/kit";
import { DoorOpen, Plus, QrCode, Trash2, Users } from "lucide-react";
import { TONES, toneAt } from "@/palette";

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

const EMPTY_FORM = { name: "", address: "", city: "", region: "", phone: "", capacity: "", opensAt: "06:00", closesAt: "22:00" };

export default function LocationsPage() {
  const [data, setData] = useState<LocationList | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
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
      setForm(EMPTY_FORM);
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
    <Box>
      <PageHeader
        title="Clubs"
        subtitle={`${data?.total ?? 0} locations in this gym brand`}
        actions={
          <Button variant="contained" startIcon={<Plus size={16} />} onClick={() => setModalOpen(true)}>
            New club
          </Button>
        }
      />
      {error && <ErrorState message={error} onRetry={() => void load()} />}
      {!data && !error && <LoadingSkeleton />}
      {data && data.items.length === 0 && <EmptyState title="No clubs yet" hint="Add the first location to start assigning members." />}
      {data && data.items.length > 0 && (
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr", lg: "repeat(3, 1fr)" } }}>
          {data.items.map((co, index) => (
            <Panel key={co.id} sx={{ display: "flex", flexDirection: "column" }}>
              <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
                <Box
                  sx={{
                    display: "grid",
                    placeItems: "center",
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    backgroundColor: TONES[toneAt(index)].soft,
                    boxShadow: `inset 0 0 0 1px ${TONES[toneAt(index)].soft}`,
                    color: TONES[toneAt(index)].main,
                    fontSize: 18,
                    fontWeight: 700,
                  }}
                >
                  {co.name.slice(0, 1).toUpperCase()}
                </Box>
                <Tooltip title="Archive club">
                  <IconButton aria-label="Archive club" onClick={() => void remove(co.id)}>
                    <Trash2 size={16} />
                  </IconButton>
                </Tooltip>
              </Stack>
              <Typography sx={{ mt: 1.5, fontSize: 16, fontWeight: 650 }}>{co.name}</Typography>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                {co.address || "No address"}
                {co.city ? ` · ${co.city}${co.region ? `, ${co.region}` : ""}` : ""}
              </Typography>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1, color: "text.secondary" }}>
                <DoorOpen size={13} />
                <Typography variant="caption">
                  {co.opensAt || "—"}–{co.closesAt || "—"}
                </Typography>
                {co.phone ? (
                  <Typography variant="caption" sx={{ ml: "auto" }}>
                    {co.phone}
                  </Typography>
                ) : null}
              </Stack>
              <Stack direction="row" flexWrap="wrap" gap={2} sx={{ mt: 2, pt: 1.5, borderTop: "1px solid rgba(140,165,220,0.1)", color: "text.secondary" }}>
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <Users size={12} />
                  <Typography variant="caption">
                    {co._count.members} members{co.capacity ? ` / ${co.capacity}` : ""}
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <QrCode size={12} />
                  <Typography variant="caption">{co._count.checkIns} check-ins</Typography>
                </Stack>
                <Typography variant="caption">{co._count.memberships} contracts</Typography>
              </Stack>
            </Panel>
          ))}
        </Box>
      )}
      {data && data.items.length > 0 && (
        <Panel padded={false} sx={{ mt: 2 }}>
          <PaginationBar page={data.page} pages={data.pages} total={data.total} onPage={setPage} />
        </Panel>
      )}

      <Modal open={modalOpen} title="New club" onClose={() => setModalOpen(false)}>
        <Box component="form" onSubmit={create}>
          <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
            <TextField required label="Club name" size="small" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <TextField label="Phone" size="small" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <TextField label="Address" size="small" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            <TextField label="City" size="small" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            <TextField label="Region" size="small" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} />
            <TextField label="Capacity" type="number" size="small" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
            <TextField label="Opens at" type="time" size="small" value={form.opensAt} onChange={(e) => setForm({ ...form, opensAt: e.target.value })} />
            <TextField label="Closes at" type="time" size="small" value={form.closesAt} onChange={(e) => setForm({ ...form, closesAt: e.target.value })} />
          </Box>
          {formError && (
            <Typography variant="body2" sx={{ color: "text.secondary", mt: 2 }}>
              {formError}
            </Typography>
          )}
          <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 3 }}>
            <Button variant="outlined" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="contained">
              Create club
            </Button>
          </Stack>
        </Box>
      </Modal>
    </Box>
  );
}
