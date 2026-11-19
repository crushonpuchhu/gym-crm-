"use client";
import { FormEvent, useCallback, useEffect, useState } from "react";
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
  Panel,
  PriorityChip,
  StatusChip,
  TableShell,
} from "@/components/kit";
import { ArrowRightLeft, Filter, Plus, Search, Trash2, Upload } from "lucide-react";

interface Prospect {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  fitnessGoal: string | null;
  status: string;
  priority: string;
  score: number;
  value: string | null;
  owner: { id: string; name: string } | null;
  location: { id: string; name: string } | null;
}
interface ProspectList { items: Prospect[]; total: number; page: number; limit: number; pages: number }
interface Location { id: string; name: string }

const STATUS_OPTIONS = ["", "NEW", "CONTACTED", "TOUR_BOOKED", "TOURED", "TRIAL", "NEGOTIATING", "JOINED", "LOST"];
const SOURCE_OPTIONS = ["WALK_IN", "WEBSITE", "REFERRAL", "INSTAGRAM", "FACEBOOK", "GOOGLE", "EVENT", "PARTNER", "OTHER"];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH"];
const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  locationId: "",
  source: "WALK_IN",
  priority: "MEDIUM",
  value: "",
  fitnessGoal: "",
};

export default function ProspectsPage() {
  const [data, setData] = useState<ProspectList | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [csvText, setCsvText] = useState("firstname,lastname,email,phone,source,priority,value,fitnessgoal\n");
  const [importResult, setImportResult] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), limit: "15" });
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      setData(await api<ProspectList>(`/prospects?${params.toString()}`));
    } catch (err: any) {
      setError(err?.message || "Failed to load prospects");
    }
  }, [page, search, status]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    api<{ items: Location[] }>("/locations?limit=50").then((r) => setLocations(r.items)).catch(() => undefined);
  }, []);

  const createProspect = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");
    try {
      await api("/prospects", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          locationId: form.locationId || undefined,
          value: form.value ? Number(form.value) : undefined,
        }),
      });
      setModalOpen(false);
      setForm(EMPTY_FORM);
      await load();
    } catch (err: any) {
      setFormError(err?.message || "Failed to create prospect");
    }
  };

  const convertProspect = async (id: string) => {
    setBusy(true);
    try {
      await api(`/prospects/${id}/convert`, { method: "POST" });
      await load();
    } catch (err: any) {
      alert(err?.message || "Convert failed");
    } finally {
      setBusy(false);
    }
  };

  const importCsv = async () => {
    setImportResult("");
    try {
      const result = await api<{ created: number; rejected: number; errors: string[] }>("/prospects/import", {
        method: "POST",
        body: JSON.stringify({ csv: csvText }),
      });
      setImportResult(`Imported ${result.created} prospect(s), rejected ${result.rejected}.${result.errors.length ? " " + result.errors.join("; ") : ""}`);
      await load();
    } catch (err: any) {
      setImportResult(err?.message || "Import failed");
    }
  };

  const deleteProspect = async (id: string) => {
    if (!confirm("Delete this prospect?")) return;
    setBusy(true);
    try {
      await api(`/prospects/${id}`, { method: "DELETE" });
      await load();
    } catch (err: any) {
      alert(err?.message || "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box>
      <PageHeader
        title="Prospects"
        subtitle={`${data?.total ?? 0} enquiries, trials and guest passes`}
        actions={
          <>
            <Button variant="outlined" startIcon={<Upload size={16} />} onClick={() => setImportOpen(true)}>
              Import CSV
            </Button>
            <Button variant="contained" startIcon={<Plus size={16} />} onClick={() => setModalOpen(true)}>
              New prospect
            </Button>
          </>
        }
      />

      <Panel padded={false} sx={{ p: 1.5, mb: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <TextField
            size="small"
            placeholder="Search name, email, phone…"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            slotProps={{
              htmlInput: { "aria-label": "Search prospects" },
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={15} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ flex: 1, minWidth: 200 }}
          />
          <TextField
            select
            size="small"
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
            slotProps={{
              htmlInput: { "aria-label": "Filter by status" },
              select: {
                displayEmpty: true,
                renderValue: (selected: any) => (selected ? String(selected).replaceAll("_", " ") : "All statuses"),
              },
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Filter size={15} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ minWidth: 190 }}
          >
            {STATUS_OPTIONS.map((s) => (
              <MenuItem key={s} value={s}>
                {s ? s.replaceAll("_", " ") : "All statuses"}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </Panel>

      {error && <ErrorState message={error} onRetry={() => void load()} />}
      {!data && !error && <LoadingSkeleton />}
      {data && data.items.length === 0 && <EmptyState title="No prospects found" hint="Adjust filters or add the first enquiry from the front desk." />}
      {data && data.items.length > 0 && (
        <TableShell>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Prospect</TableCell>
                <TableCell>Club</TableCell>
                <TableCell>Goal</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Score</TableCell>
                <TableCell>Owner</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.items.map((prospect) => (
                <TableRow key={prospect.id} hover>
                  <TableCell>
                    <Typography sx={{ fontWeight: 600, fontSize: 13.5 }}>
                      {prospect.firstName} {prospect.lastName}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      {prospect.email || prospect.phone || "—"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      {prospect.location?.name || "—"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      {prospect.fitnessGoal || "—"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Stack spacing={0.75} alignItems="flex-start">
                      <StatusChip status={prospect.status} />
                      <PriorityChip priority={prospect.priority} />
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: "Geist Mono, ui-monospace, monospace" }}>
                      {prospect.score}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      {prospect.owner?.name || "—"}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Convert to member">
                      <span>
                        <IconButton aria-label="Convert prospect" disabled={busy} onClick={() => void convertProspect(prospect.id)}>
                          <ArrowRightLeft size={16} />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Delete prospect">
                      <span>
                        <IconButton aria-label="Delete prospect" disabled={busy} onClick={() => void deleteProspect(prospect.id)}>
                          <Trash2 size={16} />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <PaginationBar page={data.page} pages={data.pages} total={data.total} onPage={setPage} />
        </TableShell>
      )}

      <Modal open={importOpen} title="Import prospects from CSV" onClose={() => setImportOpen(false)}>
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 1.5 }}>
          Header row required:{" "}
          <Box component="code" sx={{ fontFamily: "Geist Mono, monospace", fontSize: 11.5 }}>
            firstname,lastname,email,phone,source,priority,value,fitnessgoal
          </Box>
          . Source and priority are case-insensitive.
        </Typography>
        <TextField
          fullWidth
          multiline
          minRows={8}
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          spellCheck={false}
          sx={{ "& textarea": { fontFamily: "Geist Mono, ui-monospace, monospace", fontSize: 12 } }}
        />
        {importResult && (
          <Typography variant="body2" sx={{ mt: 1.5, color: "text.secondary", border: "1px solid rgba(140,165,220,0.14)", borderRadius: 2, px: 1.5, py: 1 }}>
            {importResult}
          </Typography>
        )}
        <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 2.5 }}>
          <Button variant="outlined" onClick={() => setImportOpen(false)}>
            Close
          </Button>
          <Button variant="contained" onClick={() => void importCsv()}>
            Run import
          </Button>
        </Stack>
      </Modal>

      <Modal open={modalOpen} title="New prospect" onClose={() => setModalOpen(false)}>
        <Box component="form" onSubmit={createProspect}>
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
            <TextField select label="How did they find us?" size="small" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
              {SOURCE_OPTIONS.map((s) => (
                <MenuItem key={s} value={s}>
                  {s.replaceAll("_", " ")}
                </MenuItem>
              ))}
            </TextField>
            <TextField label="Fitness goal" size="small" placeholder="Lose 10 kg" value={form.fitnessGoal} onChange={(e) => setForm({ ...form, fitnessGoal: e.target.value })} />
            <TextField label="Monthly value ($)" type="number" size="small" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
            <TextField select label="Priority" size="small" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              {PRIORITIES.map((p) => (
                <MenuItem key={p} value={p}>
                  {p}
                </MenuItem>
              ))}
            </TextField>
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
              Create prospect
            </Button>
          </Stack>
        </Box>
      </Modal>
    </Box>
  );
}
