"use client";
import { FormEvent, useEffect, useState } from "react";
import {
  Box,
  Button,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { Stack } from "@/components/mui-stack";
import { api } from "@/lib/api";
import { EmptyState, ErrorState, LoadingSkeleton, Modal, PageHeader, StatusChip, TableShell } from "@/components/kit";
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

const METHODS = ["FRONT_DESK", "APP", "QR"];
const EMPTY_FORM = { memberId: "", locationId: "", method: "FRONT_DESK", durationMinutes: "60" };

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
  const [form, setForm] = useState(EMPTY_FORM);
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
      setForm(EMPTY_FORM);
      await load();
    } catch (err: any) {
      setFormError(err?.message || "Check-in failed");
    }
  };

  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!data) return <LoadingSkeleton />;

  return (
    <Box>
      <PageHeader
        title="Check-ins"
        subtitle={`${data.todayCount} today · ${data.total} on ${date}`}
        actions={
          <>
            <TextField
              type="date"
              size="small"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              slotProps={{ htmlInput: { "aria-label": "Check-in date" } }}
              sx={{ width: 160 }}
            />
            <Button variant="contained" startIcon={<Plus size={16} />} onClick={() => setModalOpen(true)}>
              Log check-in
            </Button>
          </>
        }
      />

      {data.items.length === 0 ? (
        <EmptyState title="No check-ins on this date" hint="Front desk, app and QR entries appear here." />
      ) : (
        <TableShell>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Member</TableCell>
                <TableCell>Club</TableCell>
                <TableCell>Time</TableCell>
                <TableCell>Method</TableCell>
                <TableCell>Duration</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.items.map((c) => (
                <TableRow key={c.id} hover>
                  <TableCell>
                    <Typography sx={{ fontWeight: 600, fontSize: 13.5 }}>
                      {c.member.firstName} {c.member.lastName}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      {c.member.email || "—"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      {c.location.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      {new Date(c.checkedInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <StatusChip status={c.method} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      {c.durationMinutes ? `${c.durationMinutes} min` : "—"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <StatusChip status={c.member.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Box sx={{ borderTop: "1px solid var(--gf-border)", px: 2, py: 1.5 }}>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {data.total} entries
            </Typography>
          </Box>
        </TableShell>
      )}

      <Modal open={modalOpen} title="Log a check-in" onClose={() => setModalOpen(false)}>
        <Box component="form" onSubmit={create}>
          <Stack spacing={2}>
            <TextField select required label="Member" size="small" value={form.memberId} onChange={(e) => setForm({ ...form, memberId: e.target.value })}>
              <MenuItem value="">Select a member</MenuItem>
              {members.map((m) => (
                <MenuItem key={m.id} value={m.id} disabled={m.status === "CANCELLED"}>
                  {m.firstName} {m.lastName} · {m.status}
                </MenuItem>
              ))}
            </TextField>
            <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "1fr 1fr" }}>
              <TextField select label="Club" size="small" value={form.locationId} onChange={(e) => setForm({ ...form, locationId: e.target.value })}>
                <MenuItem value="">Member&apos;s home club</MenuItem>
                {locations.map((l) => (
                  <MenuItem key={l.id} value={l.id}>
                    {l.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField select label="Method" size="small" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
                {METHODS.map((method) => (
                  <MenuItem key={method} value={method}>
                    {method.replaceAll("_", " ")}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
            <TextField
              label="Session length (minutes)"
              type="number"
              size="small"
              value={form.durationMinutes}
              onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
              slotProps={{ htmlInput: { min: 1, max: 600 } }}
            />
          </Stack>
          {formError && (
            <Typography variant="body2" sx={{ color: "text.secondary", mt: 2 }}>
              {formError}
            </Typography>
          )}
          <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 3 }}>
            <Button variant="outlined" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" startIcon={<Users size={15} />}>
              Check in
            </Button>
          </Stack>
        </Box>
      </Modal>
    </Box>
  );
}
