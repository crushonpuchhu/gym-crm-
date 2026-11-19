"use client";
import { useEffect, useState } from "react";
import { Avatar, Box, MenuItem, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from "@mui/material";
import { api } from "@/lib/api";
import { ErrorState, LoadingSkeleton, PageHeader, TableShell } from "@/components/kit";
import { ShieldCheck } from "lucide-react";

interface OrgUser { id: string; name: string; email: string; role: string }
const ROLES = ["ORG_OWNER", "ORG_ADMIN", "CLUB_MANAGER", "MEMBERSHIP_ADVISOR", "SUPPORT_MANAGER", "SUPPORT_AGENT", "VIEWER"];

export default function UsersPage() {
  const [users, setUsers] = useState<OrgUser[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setError("");
    try {
      setUsers(await api<OrgUser[]>("/users"));
    } catch (err: any) {
      setError(err?.message || "Failed to load users");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const changeRole = async (id: string, role: string) => {
    setBusy(true);
    try {
      await api(`/users/${id}/role`, { method: "PATCH", body: JSON.stringify({ role }) });
      await load();
    } catch (err: any) {
      alert(err?.message || "Role change failed");
    } finally {
      setBusy(false);
    }
  };

  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!users) return <LoadingSkeleton />;

  return (
    <Box sx={{ maxWidth: 940, mx: "auto" }}>
      <PageHeader title="Users & roles" subtitle={`Role-based access control · ${users.length} members`} />

      <TableShell>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Member</TableCell>
              <TableCell>Role</TableCell>
              <TableCell align="right">Change role</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id} hover>
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Avatar sx={{ width: 32, height: 32, fontSize: 12 }}>
                      {u.name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>{u.name}</Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        {u.email}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.75, color: "text.secondary" }}>
                    <ShieldCheck size={13} />
                    <Typography variant="caption" sx={{ fontFamily: "Geist Mono, monospace", fontWeight: 600, letterSpacing: "0.04em" }}>
                      {u.role.replaceAll("_", " ")}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <TextField
                    select
                    size="small"
                    value={u.role}
                    disabled={busy}
                    onChange={(e) => void changeRole(u.id, e.target.value)}
                    slotProps={{ htmlInput: { "aria-label": "Change role" } }}
                    sx={{ width: 210 }}
                  >
                    {ROLES.map((r) => (
                      <MenuItem key={r} value={r}>
                        {r.replaceAll("_", " ")}
                      </MenuItem>
                    ))}
                  </TextField>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableShell>
    </Box>
  );
}
