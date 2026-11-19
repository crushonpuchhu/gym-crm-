"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Box, Button, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { LoadingSkeleton, PageHeader, Panel } from "@/components/kit";

interface AuditEntry { id: string; action: string; entityType: string; createdAt: string; user?: { name: string } | null }

export default function SettingsPage() {
  const { user } = useAuth();
  const [orgName, setOrgName] = useState("");
  const [audit, setAudit] = useState<AuditEntry[] | null>(null);

  useEffect(() => {
    api<any[]>("/organizations/list").then((list) => setOrgName(list?.[0]?.name ?? "")).catch(() => undefined);
    api<{ items: AuditEntry[] }>("/admin/audit-logs").then((r) => setAudit(r.items)).catch(() => setAudit([]));
  }, []);

  return (
    <Box sx={{ maxWidth: 940, mx: "auto" }}>
      <PageHeader title="Gym brand settings" subtitle="Brand profile, staff access and the audit trail" />

      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" } }}>
        <Panel>
          <Typography variant="overline" sx={{ color: "text.secondary" }}>
            Gym brand
          </Typography>
          <Typography sx={{ mt: 0.75, fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em" }}>{orgName || "…"}</Typography>
          <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 2 }}>
            Signed in as
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.25 }}>
            {user?.name} · {user?.email}
          </Typography>
          <Button component={Link} href="/users" variant="outlined" size="small" sx={{ mt: 2 }}>
            Manage staff &amp; roles
          </Button>
        </Panel>
        <Panel>
          <Typography variant="overline" sx={{ color: "text.secondary" }}>
            Data export
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 1 }}>
            Download members, memberships, prospects, tickets and check-ins as CSV.
          </Typography>
          <Button component={Link} href="/reports" variant="outlined" size="small" sx={{ mt: 2 }}>
            Open club reports
          </Button>
        </Panel>
      </Box>

      <Panel sx={{ mt: 2 }}>
        <Typography variant="overline" sx={{ color: "text.secondary" }}>
          Recent audit log
        </Typography>
        {!audit && (
          <Box sx={{ mt: 1.5 }}>
            <LoadingSkeleton rows={5} />
          </Box>
        )}
        {audit && audit.length === 0 && (
          <Typography variant="body2" sx={{ py: 4, textAlign: "center", color: "text.disabled" }}>
            No audit events yet
          </Typography>
        )}
        {audit && audit.length > 0 && (
          <Box sx={{ mt: 1 }}>
            <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Time</TableCell>
                    <TableCell>Actor</TableCell>
                    <TableCell>Action</TableCell>
                    <TableCell>Entity</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {audit.slice(0, 20).map((a) => (
                    <TableRow key={a.id} hover>
                      <TableCell>
                        <Typography variant="caption" sx={{ color: "text.secondary" }}>
                          {new Date(a.createdAt).toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">{a.user?.name || "system"}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ fontFamily: "Geist Mono, monospace" }}>
                          {a.action}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">{a.entityType}</Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
            </Table>
          </Box>
        )}
      </Panel>
    </Box>
  );
}
