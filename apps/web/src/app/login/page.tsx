"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Alert,
  Box,
  Button,
  Chip,
  CssBaseline,
  Divider,
  Paper,
  TextField,
  ThemeProvider,
  Typography,
} from "@mui/material";
import { Stack } from "@/components/mui-stack";
import { Dumbbell } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { theme } from "@/theme";

const DEMO_ACCOUNTS = [
  { email: "owner@demo.com", label: "Owner" },
  { email: "manager@demo.com", label: "Club manager" },
  { email: "rep@demo.com", label: "Advisor" },
  { email: "supportlead@demo.com", label: "Support lead" },
];

export default function LoginPage() {
  const { login, user, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Already signed in (deep link or browser Back): go straight to the app.
  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(email, password);
      router.replace("/dashboard");
    } catch (err: any) {
      setError(err?.message || "Sign in failed");
    } finally {
      setBusy(false);
    }
  };

  const useDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("password123");
    setError("");
  };

  if (loading || user) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
          <Box
            sx={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              border: "2px solid rgba(255,255,255,0.12)",
              borderTopColor: "#f5f5f6",
              animation: "spin 0.8s linear infinite",
              "@keyframes spin": { to: { transform: "rotate(360deg)" } },
            }}
          />
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          px: 2,
          py: 6,
        }}
      >
        <Box sx={{ width: "100%", maxWidth: 420 }}>
          <Stack alignItems="center" spacing={1.25} sx={{ mb: 3 }}>
            <Box
              sx={{
                display: "grid",
                placeItems: "center",
                width: 46,
                height: 46,
                borderRadius: 3,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "linear-gradient(160deg, rgba(255,255,255,0.16), rgba(255,255,255,0.02))",
              }}
            >
              <Dumbbell size={20} />
            </Box>
            <Typography variant="h2">GymFlow</Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Member CRM for gym brands
            </Typography>
          </Stack>

          <Paper sx={{ borderRadius: 4, p: { xs: 2.5, sm: 3.5 } }}>
            <form onSubmit={submit}>
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  size="small"
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@yourgym.com"
                  autoComplete="email"
                  required
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                />
                {error ? <Alert severity="error">{error}</Alert> : null}
                <Button type="submit" variant="contained" size="large" disabled={busy} sx={{ mt: 0.5 }}>
                  {busy ? "Signing in…" : "Sign in"}
                </Button>
              </Stack>
            </form>

            <Divider sx={{ my: 2.5 }} />

            <Typography variant="overline" sx={{ color: "text.secondary" }}>
              Demo accounts · password123
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 1 }}>
              {DEMO_ACCOUNTS.map((account) => (
                <Chip
                  key={account.email}
                  label={account.label}
                  onClick={() => useDemo(account.email)}
                  sx={{ cursor: "pointer", textTransform: "none", letterSpacing: 0 }}
                />
              ))}
            </Stack>
          </Paper>

          <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center", mt: 2.5 }}>
            New gym brand?{" "}
            <Box component={Link} href="/register" sx={{ color: "#f5f5f6", fontWeight: 600, textDecoration: "none" }}>
              Create an account
            </Box>
          </Typography>
          <Typography variant="caption" sx={{ color: "text.disabled", textAlign: "center", display: "block", mt: 1 }}>
            GymFlow · Member CRM
          </Typography>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
