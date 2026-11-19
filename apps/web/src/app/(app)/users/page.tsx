"use client";
import { useEffect, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
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
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ErrorState, LoadingSkeleton, PageHeader, Panel, TableShell } from "@/components/kit";
import { assignableRoles, roleLabel, roleMeta, ROLES } from "@/lib/roles";
import { Check, Copy, MailPlus, ShieldCheck, Trash2, UserX } from "lucide-react";

interface OrgUser { id: string; name: string; email: string; role: string }
interface Invitation {
  id: string;
  email: string;
  role: string;
  status: "pending" | "accepted" | "expired";
  expiresAt: string;
  createdAt: string;
  invitedBy: string | null;
  link: string | null;
}
interface SeatUsage { used: number; pending: number; quota: number; available: number }

const STATUS_COLOR = {
  pending: { bg: "#fef3c7", text: "#b45309" },
  accepted: { bg: "#d1fae5", text: "#047857" },
  expired: { bg: "#f1f5f9", text: "#64748b" },
} as const;

export default function UsersPage() {
  const { user, role } = useAuth();
  const [users, setUsers] = useState<OrgUser[] | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [seats, setSeats] = useState<SeatUsage | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBERSHIP_ADVISOR");
  const [inviteError, setInviteError] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [inviteTarget, setInviteTarget] = useState("");
  const [copied, setCopied] = useState(false);

  const canManage = role === "ORG_OWNER" || role === "ORG_ADMIN" || role === "SUPER_ADMIN";
  const grantable = assignableRoles(role ?? undefined);

  const load = async () => {
    setError("");
    try {
      setUsers(await api<OrgUser[]>("/users"));
    } catch (err: any) {
      setError(err?.message || "Failed to load staff");
    }
    if (canManage) {
      try {
        const data = await api<{ items: Invitation[]; seats: SeatUsage }>("/invitations");
        setInvitations(data.items);
        setSeats(data.seats);
      } catch {
        // Invitation panel is optional; the staff list stays usable.
      }
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManage]);

  const changeRole = async (id: string, nextRole: string) => {
    setBusy(true);
    try {
      await api(`/users/${id}/role`, { method: "PATCH", body: JSON.stringify({ role: nextRole }) });
      await load();
    } catch (err: any) {
      alert(err?.message || "Role change failed");
    } finally {
      setBusy(false);
    }
  };

  const deactivate = async (id: string, name: string) => {
    if (!window.confirm(`Remove ${name} from this gym brand? They keep their GymFlow login but lose access here.`)) return;
    setBusy(true);
    try {
      await api(`/users/${id}`, { method: "DELETE" });
      await load();
    } catch (err: any) {
      alert(err?.message || "Could not remove this member");
    } finally {
      setBusy(false);
    }
  };

  const revokeInvite = async (id: string) => {
    setBusy(true);
    try {
      await api(`/invitations/${id}`, { method: "DELETE" });
      await load();
    } catch (err: any) {
      alert(err?.message || "Could not revoke this invitation");
    } finally {
      setBusy(false);
    }
  };

  const sendInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setInviteError("");
    try {
      const created = await api<{ link: string }>("/invitations", {
        method: "POST",
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      setInviteTarget(inviteEmail);
      setInviteLink(created.link);
      setInviteEmail("");
      await load();
    } catch (err: any) {
      setInviteError(err?.message || "Invitation failed");
    } finally {
      setBusy(false);
    }
  };

  const closeInvite = () => {
    setInviteOpen(false);
    setInviteLink("");
    setInviteTarget("");
    setInviteError("");
    setCopied(false);
  };

  const copyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setInviteError("Copy failed — select the link and copy it manually.");
    }
  };

  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!users) return <LoadingSkeleton />;

  const pending = invitations.filter((invite) => invite.status === "pending");
  const seatPct = seats ? Math.min(Math.round(((seats.used + seats.pending) / Math.max(seats.quota, 1)) * 100), 100) : 0;

  return (
    <Box>
      <PageHeader
        title="Staff & access"
        subtitle={`Role-based access for this gym brand · ${users.length} ${users.length === 1 ? "account" : "accounts"}`}
        actions={
          canManage ? (
            <Button variant="contained" size="small" startIcon={<MailPlus size={15} />} onClick={() => setInviteOpen(true)}>
              Invite staff
            </Button>
          ) : (
            <Chip label="Read-only access to this screen" size="small" />
          )
        }
      />

      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) 320px" }, alignItems: "start" }}>
        <Box sx={{ display: "grid", gap: 2, minWidth: 0 }}>
          <TableShell>
            <Box sx={{ px: 2.5, pt: 2.25, pb: 0.5 }}>
              <Typography variant="overline" sx={{ color: "text.secondary" }}>
                Active accounts
              </Typography>
            </Box>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Member</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell align="right">Access</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((u) => {
                  const meta = roleMeta(u.role);
                  const isSelf = u.id === user?.id;
                  const locked = u.role === "ORG_OWNER" || isSelf || !canManage;
                  return (
                    <TableRow key={u.id} hover>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                          <Avatar sx={{ width: 32, height: 32, fontSize: 12 }}>
                            {u.name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()}
                          </Avatar>
                          <Box>
                            <Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>
                              {u.name}
                              {isSelf ? <Box component="span" sx={{ color: "text.disabled", fontWeight: 500 }}> · you</Box> : null}
                            </Typography>
                            <Typography variant="caption" sx={{ color: "text.secondary" }}>
                              {u.email}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.75, color: "text.secondary" }}>
                          <ShieldCheck size={13} />
                          <Typography variant="caption" sx={{ fontWeight: 600 }}>{meta?.label ?? roleLabel(u.role)}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ color: "text.secondary" }}>{meta?.department ?? "—"}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
                          <TextField
                            select
                            size="small"
                            value={u.role}
                            disabled={busy || locked}
                            onChange={(e) => void changeRole(u.id, e.target.value)}
                            slotProps={{ htmlInput: { "aria-label": `Role for ${u.name}` } }}
                            sx={{ width: 190 }}
                          >
                            {/* Keep a role the actor cannot grant visible but unselectable. */}
                            {ROLES.filter((r) => grantable.some((g) => g.key === r.key) || r.key === u.role).map((r) => (
                              <MenuItem key={r.key} value={r.key}>
                                {r.label}
                              </MenuItem>
                            ))}
                          </TextField>
                          {canManage && !locked ? (
                            <Tooltip title="Remove from brand">
                              <IconButton size="small" onClick={() => void deactivate(u.id, u.name)} aria-label={`Remove ${u.name}`}>
                                <UserX size={15} />
                              </IconButton>
                            </Tooltip>
                          ) : null}
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableShell>

          {canManage ? (
            <TableShell>
              <Box sx={{ px: 2.5, pt: 2.25, pb: 0.5, display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                <Typography variant="overline" sx={{ color: "text.secondary" }}>
                  Pending invitations
                </Typography>
                <Typography variant="caption" sx={{ color: "text.disabled" }}>
                  {pending.length} open · links expire after 7 days
                </Typography>
              </Box>
              {invitations.length === 0 ? (
                <Box sx={{ px: 2.5, py: 4 }}>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    No invitations yet. Invite a receptionist, advisor or manager with the button above.
                  </Typography>
                </Box>
              ) : (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Email</TableCell>
                      <TableCell>Role</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Invite link</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {invitations.map((invite) => {
                      const tone = STATUS_COLOR[invite.status];
                      return (
                        <TableRow key={invite.id} hover>
                          <TableCell>
                            <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{invite.email}</Typography>
                            <Typography variant="caption" sx={{ color: "text.secondary" }}>
                              invited by {invite.invitedBy ?? "staff"}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption">{roleLabel(invite.role)}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={invite.status}
                              size="small"
                              sx={{
                                backgroundColor: tone.bg,
                                color: tone.text,
                                textTransform: "capitalize",
                                letterSpacing: 0,
                                fontSize: 11,
                              }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            {invite.link ? (
                              <Box sx={{ display: "inline-flex", gap: 0.5 }}>
                                <Tooltip title="Copy invite link">
                                  <IconButton size="small" aria-label={`Copy invite link for ${invite.email}`} onClick={() => void copyLink(invite.link!)}>
                                    <Copy size={14} />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Revoke invitation">
                                  <IconButton size="small" aria-label={`Revoke invite for ${invite.email}`} onClick={() => void revokeInvite(invite.id)}>
                                    <Trash2 size={14} />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            ) : (
                              <Typography variant="caption" sx={{ color: "text.disabled" }}>—</Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </TableShell>
          ) : null}
        </Box>

        <Box sx={{ display: "grid", gap: 2 }}>
          {canManage && seats ? (
            <Panel>
              <Typography variant="overline" sx={{ color: "text.secondary" }}>
                Staff seats
              </Typography>
              <Typography sx={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.03em", mt: 0.75 }}>
                {seats.used + seats.pending}
                <Box component="span" sx={{ fontSize: 14, fontWeight: 500, color: "text.secondary" }}> / {seats.quota}</Box>
              </Typography>
              <LinearProgress variant="determinate" value={seatPct} sx={{ mt: 1.5 }} />
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 1.25 }}>
                {seats.used} active · {seats.pending} pending · {seats.available} free
              </Typography>
            </Panel>
          ) : null}

          <Panel>
            <Typography variant="overline" sx={{ color: "text.secondary" }}>
              What each role can do
            </Typography>
            <Box sx={{ display: "grid", gap: 1.25, mt: 1.5 }}>
              {ROLES.map((roleDefinition) => (
                <Box key={roleDefinition.key} sx={{ borderTop: "1px solid var(--gf-border)", pt: 1.25, "&:first-of-type": { borderTop: "none", pt: 0 } }}>
                  <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 1 }}>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 650 }}>{roleDefinition.label}</Typography>
                    <Typography variant="caption" sx={{ color: "text.disabled", whiteSpace: "nowrap" }}>{roleDefinition.department}</Typography>
                  </Box>
                  <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.25, lineHeight: 1.55 }}>
                    {roleDefinition.description}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Panel>
        </Box>
      </Box>

      <Dialog open={inviteOpen} onClose={closeInvite} fullWidth maxWidth="sm">
        <DialogTitle>Invite a staff member</DialogTitle>
        {inviteLink ? (
          <DialogContent>
            <Alert severity="success" sx={{ mb: 2 }}>
              Invitation created. Send this link to <strong>{inviteTarget}</strong> — they set their own password.
            </Alert>
            <TextField fullWidth value={inviteLink} slotProps={{ input: { readOnly: true } }} label="Invite link" />
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 1.25 }}>
              In production this link is emailed automatically. It expires in 7 days and only works once.
            </Typography>
            <DialogActions sx={{ px: 0, pb: 0, mt: 2 }}>
              <Button onClick={() => void copyLink(inviteLink)} startIcon={copied ? <Check size={15} /> : <Copy size={15} />}>
                {copied ? "Copied" : "Copy link"}
              </Button>
              <Button variant="contained" onClick={closeInvite}>Done</Button>
            </DialogActions>
          </DialogContent>
        ) : (
          <form onSubmit={sendInvite}>
            <DialogContent>
              <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
                They get their own login and only see this brand&apos;s data.
              </Typography>
              <TextField
                fullWidth
                label="Work email"
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="reception@yourgym.com"
                sx={{ mb: 2 }}
              />
              <TextField
                select
                fullWidth
                label="Role"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
              >
                {grantable.map((roleDefinition) => (
                  <MenuItem key={roleDefinition.key} value={roleDefinition.key}>
                    {roleDefinition.label} · {roleDefinition.department}
                  </MenuItem>
                ))}
              </TextField>
              <Box sx={{ mt: 1.5, p: 1.5, borderRadius: 2, backgroundColor: "action.hover" }}>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {roleMeta(inviteRole)?.description}
                </Typography>
                <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", mt: 1 }}>
                  {roleMeta(inviteRole)?.can.map((item) => (
                    <Chip key={item} label={item} size="small" sx={{ textTransform: "none", letterSpacing: 0 }} />
                  ))}
                </Box>
              </Box>
              {inviteError ? <Alert severity="error" sx={{ mt: 2 }}>{inviteError}</Alert> : null}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5 }}>
              <Button onClick={closeInvite} disabled={busy}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={busy} startIcon={busy ? <CircularProgress size={14} /> : undefined}>
                Create invitation
              </Button>
            </DialogActions>
          </form>
        )}
      </Dialog>
    </Box>
  );
}
