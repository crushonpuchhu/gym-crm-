"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Avatar, Box, IconButton, Typography } from "@mui/material";
import { Stack } from "@/components/mui-stack";
import { Dumbbell, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ColorModeProvider, ColorModeToggle } from "@/components/color-mode";

/**
 * Vendor surface. Deliberately outside the `(app)` shell: it has no brand
 * selector and no tenant navigation, because platform staff do not belong to a
 * gym. Access is re-checked by the API on every call.
 */
export default function PlatformLayout({ children }: { children: ReactNode }) {
  return (
    <ColorModeProvider>
      <PlatformShell>{children}</PlatformShell>
    </ColorModeProvider>
  );
}

function PlatformShell({ children }: { children: ReactNode }) {
  const { user, loading, logout, impersonation } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    // Support sessions borrow a brand token; never let them reach the vendor console.
    else if (impersonation) router.replace("/dashboard");
    else if (!user.isPlatformAdmin) router.replace("/dashboard");
  }, [loading, user, impersonation, router]);

  if (loading || !user || !user.isPlatformAdmin || impersonation) {
    return (
      <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <Box
          sx={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            border: "2px solid var(--gf-border)",
            borderTopColor: "var(--gf-accent)",
            animation: "spin 0.8s linear infinite",
            "@keyframes spin": { to: { transform: "rotate(360deg)" } },
          }}
        />
      </Box>
    );
  }

  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "background.default" }}>
      <Box
        component="header"
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          height: 68,
          px: { xs: 2, lg: 4 },
          borderBottom: "1px solid",
          borderColor: "divider",
          backgroundColor: "var(--gf-header)",
          backdropFilter: "blur(14px)",
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              display: "grid",
              placeItems: "center",
              width: 36,
              height: 36,
              borderRadius: 2,
              border: "1px solid rgba(75,124,242,0.45)",
              background: "linear-gradient(160deg, var(--gf-accent), var(--gf-chart-bar-bottom))",
              color: "#fff",
            }}
          >
            <Dumbbell size={17} strokeWidth={2.1} />
          </Box>
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography sx={{ fontWeight: 700, fontSize: 15 }}>GymFlow</Typography>
              <Box
                sx={{
                  px: 0.8,
                  py: 0.15,
                  borderRadius: 1,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "var(--gf-accent)",
                  border: "1px solid var(--gf-accent-border)",
                  backgroundColor: "var(--gf-accent-soft)",
                }}
              >
                Platform
              </Box>
            </Stack>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Vendor console · all gym brands
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center">
          <ColorModeToggle />
          <Avatar sx={{ width: 30, height: 30, fontSize: 11 }}>{initials}</Avatar>
          <Box sx={{ display: { xs: "none", sm: "block" } }}>
            <Typography sx={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.2 }}>{user.name}</Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {user.email}
            </Typography>
          </Box>
          <IconButton
            aria-label="Sign out"
            onClick={async () => {
              await logout();
              router.replace("/login");
            }}
          >
            <LogOut size={17} />
          </IconButton>
        </Stack>
      </Box>

      <Box sx={{ maxWidth: 1440, mx: "auto", px: { xs: 2, lg: 4 }, py: 3 }}>
        {children}
      </Box>

      <Box sx={{ maxWidth: 1440, mx: "auto", px: { xs: 2, lg: 4 }, pb: 4 }}>
        <Typography variant="caption" sx={{ color: "text.disabled" }}>
          Viewing commercial data only. To inspect gym records, use a read-only support view from the gym's manage panel.{" "}
          <Box component={Link} href="/dashboard" sx={{ color: "text.secondary" }}>
            Tenant workspace
          </Box>
        </Typography>
      </Box>
    </Box>
  );
}
