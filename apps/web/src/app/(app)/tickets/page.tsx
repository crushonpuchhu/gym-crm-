"use client";
import { FormEvent, useEffect, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  IconButton,
  InputAdornment,
  MenuItem,
  TextField,
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
  Panel,
  PriorityChip,
  StatusChip,
} from "@/components/kit";
import { Inbox, Plus, Send } from "lucide-react";
import { TONES } from "@/palette";

interface Comment { id: string; body: string; isInternal: boolean; createdAt: string; author: { name: string } }
interface Ticket { id: string; ticketNumber: string; subject: string; reporterName: string; reporterEmail: string; category: string; status: string; priority: string; owner?: { name: string } | null; location?: { name: string } | null; comments?: Comment[]; createdAt: string }
interface TicketList { items: Ticket[]; total: number }

const STATUS_FLOW = ["NEW", "OPEN", "PENDING", "IN_PROGRESS", "RESOLVED", "CLOSED"];
const CATEGORIES = ["BILLING", "EQUIPMENT", "CLASS_BOOKING", "ACCESS", "CLEANLINESS", "STAFF", "OTHER"];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const EMPTY_FORM = { reporterEmail: "", reporterName: "", category: "OTHER", subject: "", description: "", priority: "MEDIUM" };

export default function TicketsPage() {
  const [data, setData] = useState<TicketList | null>(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [comment, setComment] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");

  const load = async () => {
    setError("");
    try {
      setData(await api<TicketList>("/tickets?limit=25"));
    } catch (err: any) {
      setError(err?.message || "Failed to load tickets");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const openTicket = async (id: string) => {
    try {
      setSelected(await api<Ticket>(`/tickets/${id}`));
    } catch {
      alert("Failed to load ticket");
    }
  };

  const createTicket = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");
    try {
      await api("/tickets", { method: "POST", body: JSON.stringify(form) });
      setModalOpen(false);
      setForm(EMPTY_FORM);
      await load();
    } catch (err: any) {
      setFormError(err?.message || "Failed to create ticket");
    }
  };

  const addComment = async (e: FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    try {
      await api(`/tickets/${selected.id}/comments`, { method: "POST", body: JSON.stringify({ body: comment, isInternal }) });
      setComment("");
      setSelected(await api<Ticket>(`/tickets/${selected.id}`));
    } catch (err: any) {
      alert(err?.message || "Failed to add comment");
    }
  };

  const setStatus = async (status: string) => {
    if (!selected) return;
    try {
      await api(`/tickets/${selected.id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      setSelected(await api<Ticket>(`/tickets/${selected.id}`));
      await load();
    } catch (err: any) {
      alert(err?.message || "Failed to update status");
    }
  };

  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!data) return <LoadingSkeleton />;

  return (
    <Box>
      <PageHeader
        title="Support inbox"
        subtitle={`${data.total} member conversations`}
        actions={
          <Button variant="contained" startIcon={<Plus size={14} />} onClick={() => setModalOpen(true)}>
            New ticket
          </Button>
        }
      />

      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr", lg: "2fr 3fr" },
          alignItems: "start",
        }}
      >
        <Panel padded={false} sx={{ display: "flex", flexDirection: "column", height: "calc(100vh - 14rem)", minHeight: 460 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ p: 2, borderBottom: "1px solid rgba(140,165,220,0.12)" }}>
            <Inbox size={16} color="#8d8d95" />
            <Typography sx={{ fontWeight: 600, fontSize: 13.5 }}>Member support · {data.total}</Typography>
          </Stack>
          <Box sx={{ flex: 1, overflowY: "auto" }}>
            {data.items.length === 0 && <EmptyState title="No tickets" hint="Inbound support requests will appear here." />}
            {data.items.map((t) => {
              const active = selected?.id === t.id;
              return (
                <Box
                  key={t.id}
                  component="button"
                  onClick={() => void openTicket(t.id)}
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 0.75,
                    width: "100%",
                    textAlign: "left",
                    px: 2,
                    py: 1.75,
                    background: active ? "rgba(140,165,220,0.08)" : "transparent",
                    border: "none",
                    borderBottom: "1px solid rgba(140,165,220,0.08)",
                    color: "inherit",
                    cursor: "pointer",
                    "&:hover": { background: "rgba(140,165,220,0.06)" },
                  }}
                >
                  <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                    <Typography sx={{ fontFamily: "Geist Mono, monospace", fontSize: 10, fontWeight: 700, color: "text.disabled" }}>
                      {t.ticketNumber}
                    </Typography>
                    <PriorityChip priority={t.priority} />
                  </Stack>
                  <Typography noWrap sx={{ fontSize: 13.5, fontWeight: 600 }}>
                    {t.subject}
                  </Typography>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <StatusChip status={t.status} />
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      {t.reporterName}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ ml: "auto", border: "1px solid rgba(140,165,220,0.14)", borderRadius: 1, px: 0.75, color: "text.disabled" }}
                    >
                      {t.category.replaceAll("_", " ")}
                    </Typography>
                  </Stack>
                </Box>
              );
            })}
          </Box>
        </Panel>

        <Panel padded={false} sx={{ display: "flex", flexDirection: "column", height: "calc(100vh - 14rem)", minHeight: 460 }}>
          {!selected ? (
            <Box sx={{ flex: 1, display: "grid", placeItems: "center", p: 4 }}>
              <Typography variant="body2" sx={{ color: "text.disabled" }}>
                Select a ticket to view the conversation
              </Typography>
            </Box>
          ) : (
            <>
              <Box sx={{ p: 2, borderBottom: "1px solid rgba(140,165,220,0.12)" }}>
                <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2} flexWrap="wrap">
                  <Box>
                    <Typography sx={{ fontFamily: "Geist Mono, monospace", fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "text.disabled" }}>
                      {selected.ticketNumber}
                    </Typography>
                    <Typography sx={{ fontSize: 16, fontWeight: 650 }}>{selected.subject}</Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      {selected.reporterName} · {selected.reporterEmail}
                      {selected.location ? ` · ${selected.location.name}` : ""}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <StatusChip status={selected.status} />
                    <PriorityChip priority={selected.priority} />
                  </Stack>
                </Stack>
                <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mt: 2 }}>
                  {STATUS_FLOW.map((s) => {
                    const active = selected.status === s;
                    return (
                      <Box
                        key={s}
                        component="button"
                        onClick={() => void setStatus(s)}
                        sx={{
                          borderRadius: 999,
                          border: "1px solid",
                          borderColor: active ? "rgba(75,124,242,0.65)" : "rgba(140,165,220,0.18)",
                          backgroundColor: active ? TONES.indigo.soft : "transparent",
                          color: active ? TONES.indigo.main : "text.secondary",
                          px: 1.25,
                          py: 0.4,
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: "0.06em",
                          cursor: "pointer",
                          "&:hover": { borderColor: "rgba(75,124,242,0.6)", color: "#cfdcff" },
                        }}
                      >
                        {s.replaceAll("_", " ")}
                      </Box>
                    );
                  })}
                </Stack>
              </Box>

              <Stack spacing={1.5} sx={{ flex: 1, overflowY: "auto", p: 2 }}>
                {(selected.comments || []).map((c) => (
                  <Box
                    key={c.id}
                    sx={{
                      maxWidth: "82%",
                      alignSelf: c.isInternal ? "flex-end" : "flex-start",
                      borderRadius: 2.5,
                      p: 1.75,
                      fontSize: 13,
                      border: "1px solid rgba(140,165,220,0.12)",
                      backgroundColor: c.isInternal ? "rgba(140,165,220,0.12)" : "rgba(140,165,220,0.05)",
                    }}
                  >
                    <Typography sx={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "text.disabled", mb: 0.75 }}>
                      {c.author?.name} · {new Date(c.createdAt).toLocaleString()}
                      {c.isInternal ? " · internal note" : ""}
                    </Typography>
                    {c.body}
                  </Box>
                ))}
                {(selected.comments || []).length === 0 && (
                  <Typography variant="body2" sx={{ color: "text.disabled", textAlign: "center", pt: 6 }}>
                    No conversation yet. First response starts the SLA clock.
                  </Typography>
                )}
              </Stack>

              <Box component="form" onSubmit={addComment} sx={{ borderTop: "1px solid rgba(140,165,220,0.12)", p: 1.5 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <TextField
                    size="small"
                    fullWidth
                    placeholder="Write a reply…"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    required
                    slotProps={{ htmlInput: { "aria-label": "Reply" } }}
                  />
                  <FormControlLabel
                    control={<Checkbox size="small" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} />}
                    label="Internal"
                    sx={{ mr: 0, whiteSpace: "nowrap" }}
                  />
                  <IconButton
                    type="submit"
                    aria-label="Send reply"
                    sx={{
                      backgroundColor: "#3f6fe0",
                      color: "#ffffff",
                      "&:hover": { backgroundColor: "#3a67d6" },
                    }}
                  >
                    <Send size={16} />
                  </IconButton>
                </Stack>
              </Box>
            </>
          )}
        </Panel>
      </Box>

      <Modal open={modalOpen} title="New ticket" onClose={() => setModalOpen(false)}>
        <Box component="form" onSubmit={createTicket}>
          <Stack spacing={2}>
            <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
              <TextField required label="Member name" size="small" value={form.reporterName} onChange={(e) => setForm({ ...form, reporterName: e.target.value })} />
              <TextField required label="Member email" type="email" size="small" value={form.reporterEmail} onChange={(e) => setForm({ ...form, reporterEmail: e.target.value })} />
            </Box>
            <TextField select label="Category" size="small" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((category) => (
                <MenuItem key={category} value={category}>
                  {category.replaceAll("_", " ")}
                </MenuItem>
              ))}
            </TextField>
            <TextField required label="Subject" size="small" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            <TextField
              required
              label="Description"
              size="small"
              multiline
              minRows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <TextField select label="Priority" size="small" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              {PRIORITIES.map((priority) => (
                <MenuItem key={priority} value={priority}>
                  {priority}
                </MenuItem>
              ))}
            </TextField>
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
            <Button type="submit" variant="contained">
              Create ticket
            </Button>
          </Stack>
        </Box>
      </Modal>
    </Box>
  );
}
