"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Alert,
  Box,
  Button,
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

export default function RegisterPage() {
  const { register, user, loading } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "", name: "", organizationName: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Already signed in: registration would create a second brand for the same account.
  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);

  const setField = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await register(form);
      router.replace("/dashboard");
    } catch (err: any) {
      setError(err?.message || "Registration failed");
    } finally {
      setBusy(false);
    }
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
      <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", px: 2, py: 6 }}>
        <Box sx={{ width: "100%", maxWidth: 440 }}>
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
              Set up your gym brand workspace
            </Typography>
          </Stack>

          <Paper sx={{ borderRadius: 4, p: { xs: 2.5, sm: 3.5 } }}>
            <form onSubmit={submit}>
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  size="small"
                  label="Gym brand name"
                  value={form.organizationName}
                  onChange={setField("organizationName")}
                  required
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Your name"
                  value={form.name}
                  onChange={setField("name")}
                  required
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={setField("email")}
                  autoComplete="email"
                  required
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Password (min 8 characters)"
                  type="password"
                  value={form.password}
                  onChange={setField("password")}
                  autoComplete="new-password"
                  slotProps={{ htmlInput: { minLength: 8 } }}
                  required
                />
                {error ? <Alert severity="error">{error}</Alert> : null}
                <Button type="submit" variant="contained" size="large" disabled={busy} sx={{ mt: 0.5 }}>
                  {busy ? "Creating…" : "Create gym workspace"}
                </Button>
              </Stack>
            </form>
            <Divider sx={{ my: 2.5 }} />
            <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center" }}>
              Have an account?{" "}
              <Box component={Link} href="/login" sx={{ color: "#f5f5f6", fontWeight: 600, textDecoration: "none" }}>
                Sign in
              </Box>
            </Typography>
          </Paper>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
