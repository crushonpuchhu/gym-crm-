"use client";
import { FormEvent, useEffect, useState } from "react";
import {
  Box,
  Button,
  IconButton,
  InputAdornment,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { Stack } from "@/components/mui-stack";
import { api } from "@/lib/api";
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  Modal,
  PageHeader,
  PaginationBar,
  StatusChip,
  TableShell,
} from "@/components/kit";
import { Plus, Search, Trash2 } from "lucide-react";

interface Member {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  fitnessGoal: string | null;
  status: string;
  location: { id: string; name: string } | null;
  memberships: { id: string; status: string; monthlyValue: string; plan: { name: string } | null }[];
}
interface MemberList { items: Member[]; total: number; page: number; pages: number }
interface Location { id: string; name: string }

const STATUSES = ["TRIAL", "ACTIVE", "PAUSED", "CANCELLED", "EXPIRED"];
const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  locationId: "",
  status: "ACTIVE",
  fitnessGoal: "",
};

export default function MembersPage() {
  const [data, setData] = useState<MemberList | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");

  const load = async () => {
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), limit: "15" });
      if (search.trim()) params.set("search", search.trim());
      setData(await api<MemberList>(`/members?${params.toString()}`));
    } catch (err: any) {
      setError(err?.message || "Failed to load members");
    }
  };

  useEffect(() => {
    void load();
  }, [page, search]);

  // The shell search submits ?search=; pick it up without useSearchParams
  // so this page can stay statically prerendered.
  useEffect(() => {
    const query = new URLSearchParams(window.location.search).get("search");
    if (query) setSearch(query);
  }, []);

  // The shell search may push while this page is already mounted.
  useEffect(() => {
    const onSearch = (event: Event) => {
      setPage(1);
      setSearch((event as CustomEvent<string>).detail ?? "");
    };
    window.addEventListener("gym:search", onSearch);
    return () => window.removeEventListener("gym:search", onSearch);
  }, []);

  useEffect(() => {
    api<{ items: Location[] }>("/locations?limit=50").then((r) => setLocations(r.items)).catch(() => undefined);
  }, []);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");
    try {
      await api("/members", { method: "POST", body: JSON.stringify({ ...form, locationId: form.locationId || undefined }) });
      setModalOpen(false);
      setForm(EMPTY_FORM);
      await load();
    } catch (err: any) {
      setFormError(err?.message || "Failed to create member");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Cancel and archive this member?")) return;
    try {
      await api(`/members/${id}`, { method: "DELETE" });
      await load();
    } catch (err: any) {
      alert(err?.message || "Delete failed");
    }
  };

  return (
    <Box>
      <PageHeader
        title="Members"
        subtitle={`${data?.total ?? 0} people on record`}
        actions={
          <>
            <TextField
              size="small"
              placeholder="Search name, email, phone…"
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
              slotProps={{
                htmlInput: { "aria-label": "Search the member list" },
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={15} />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{ width: { xs: "100%", sm: 260 } }}
            />
            <Button variant="contained" startIcon={<Plus size={16} />} onClick={() => setModalOpen(true)}>
              New member
            </Button>
          </>
        }
      />

      {error && <ErrorState message={error} onRetry={() => void load()} />}
      {!data && !error && <LoadingSkeleton />}
      {data && data.items.length === 0 &&
        (search ? (
          <EmptyState title="No matches" hint={`Nobody matches “${search}”. Try a different name, email or phone.`} />
        ) : (
          <EmptyState title="No members yet" hint="Create the first member or convert a prospect." />
        ))}
      {data && data.items.length > 0 && (
        <TableShell>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Member</TableCell>
                <TableCell>Club</TableCell>
                <TableCell>Plan</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Goal</TableCell>
                <TableCell align="right">Remove</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.items.map((m) => {
                const contract = m.memberships[0];
                return (
                  <TableRow key={m.id} hover>
                    <TableCell>
                      <Typography sx={{ fontWeight: 600, fontSize: 13.5 }}>
                        {m.firstName} {m.lastName}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        {m.email || m.phone || "—"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: "text.secondary" }}>
                        {m.location?.name || "—"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{contract?.plan?.name || "No plan"}</Typography>
                      <Typography variant="caption" sx={{ color: "text.disabled" }}>
                        {contract ? `$${Number(contract.monthlyValue).toFixed(0)}/mo` : ""}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <StatusChip status={m.status} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: "text.secondary" }}>
                        {m.fitnessGoal || "—"}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Archive member">
                        <IconButton aria-label="Archive member" onClick={() => void remove(m.id)}>
                          <Trash2 size={16} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <PaginationBar page={data.page} pages={data.pages} total={data.total} onPage={setPage} />
        </TableShell>
      )}

      <Modal open={modalOpen} title="New member" onClose={() => setModalOpen(false)}>
        <Box component="form" onSubmit={create}>
          <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
            <TextField required label="First name" size="small" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            <TextField required label="Last name" size="small" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            <TextField label="Email" type="email" size="small" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <TextField label="Phone" size="small" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <TextField select label="Home club" size="small" value={form.locationId} onChange={(e) => setForm({ ...form, locationId: e.target.value })}>
              <MenuItem value="">Unassigned</MenuItem>
              {locations.map((l) => (
                <MenuItem key={l.id} value={l.id}>
                  {l.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField select label="Status" size="small" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {STATUSES.map((status) => (
                <MenuItem key={status} value={status}>
                  {status}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Fitness goal"
              size="small"
              placeholder="Build strength"
              value={form.fitnessGoal}
              onChange={(e) => setForm({ ...form, fitnessGoal: e.target.value })}
              sx={{ gridColumn: { sm: "span 2" } }}
            />
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
              Create member
            </Button>
          </Stack>
        </Box>
      </Modal>
    </Box>
  );
}
