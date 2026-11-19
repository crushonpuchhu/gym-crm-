"use client";
import { useEffect, useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import { Stack } from "@/components/mui-stack";
import { api } from "@/lib/api";
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader, Panel } from "@/components/kit";
import { CheckCheck } from "lucide-react";

interface NotificationItem { id: string; type: string; title: string; body: string; readAt: string | null; createdAt: string }
interface NotificationResponse { items: NotificationItem[]; unread: number }

export default function NotificationsPage() {
  const [data, setData] = useState<NotificationResponse | null>(null);
  const [error, setError] = useState("");

  const load = async () => {
    setError("");
    try {
      setData(await api<NotificationResponse>("/notifications"));
    } catch (err: any) {
      setError(err?.message || "Failed to load notifications");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const markAllRead = async () => {
    try {
      await api("/notifications/read-all", { method: "PATCH" });
      await load();
    } catch (err: any) {
      alert(err?.message || "Failed to mark read");
    }
  };

  const markRead = async (id: string) => {
    try {
      await api(`/notifications/${id}/read`, { method: "PATCH" });
      await load();
    } catch {
      /* non-fatal */
    }
  };

  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!data) return <LoadingSkeleton />;

  return (
    <Box sx={{ maxWidth: 780, mx: "auto" }}>
      <PageHeader
        title="Notifications"
        subtitle={`${data.unread} unread`}
        actions={
          data.unread > 0 ? (
            <Button variant="outlined" size="small" startIcon={<CheckCheck size={14} />} onClick={() => void markAllRead()}>
              Mark all read
            </Button>
          ) : undefined
        }
      />

      {data.items.length === 0 && <EmptyState title="No notifications" hint="Trial reminders, renewals and ticket updates will appear here." />}

      {data.items.length > 0 && (
        <Panel padded={false} sx={{ overflow: "hidden" }}>
          {data.items.map((n) => (
            <Box
              key={n.id}
              component="button"
              onClick={() => void markRead(n.id)}
              sx={{
                display: "flex",
                alignItems: "flex-start",
                gap: 1.75,
                width: "100%",
                textAlign: "left",
                px: 2.5,
                py: 2,
                border: "none",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                backgroundColor: n.readAt ? "transparent" : "rgba(255,255,255,0.035)",
                color: "inherit",
                cursor: "pointer",
                opacity: n.readAt ? 0.55 : 1,
                "&:hover": { backgroundColor: "rgba(255,255,255,0.06)" },
              }}
            >
              <Box
                sx={{
                  mt: 0.75,
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  flexShrink: 0,
                  backgroundColor: n.readAt ? "rgba(255,255,255,0.16)" : "#f5f5f6",
                }}
              />
              <Stack spacing={0.25} sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>{n.title}</Typography>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  {n.body}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.disabled", textTransform: "uppercase", letterSpacing: "0.06em", pt: 0.5 }}>
                  {new Date(n.createdAt).toLocaleString()}
                </Typography>
              </Stack>
            </Box>
          ))}
        </Panel>
      )}
    </Box>
  );
}
