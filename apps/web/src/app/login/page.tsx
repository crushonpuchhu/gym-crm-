"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from "@mui/material";
import { Stack } from "@/components/mui-stack";
import { ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ColorModeProvider } from "@/components/color-mode";
import { AuthShell } from "@/components/auth-shell";

const DEMO_ACCOUNTS = [
  { email: "owner@demo.com", label: "Owner" },
  { email: "manager@demo.com", label: "Club manager" },
  { email: "rep@demo.com", label: "Advisor" },
  { email: "supportlead@demo.com", label: "Support lead" },
];

export default function LoginPage() {
  return (
    <ColorModeProvider>
      <LoginView />
    </ColorModeProvider>
  );
}

function LoginView() {
  const { login, user, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
      <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <CircularProgress size={26} thickness={4.5} />
      </Box>
    );
  }

  return (
    <AuthShell
      eyebrow="Membership CRM"
      headline="Run every club from one record set."
      points={[
        "Prospects, members and contracts in a single pipeline.",
        "Front-desk check-ins, plans and billing in one place.",
        "Retention reports that explain churn, not just count it.",
      ]}
      title="Welcome back"
      subtitle="Sign in to your gym brand workspace."
      footer={
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          New gym brand?{" "}
          <Box component={Link} href="/register" sx={{ color: "primary.main", fontWeight: 600, textDecoration: "none" }}>
            Create an account
          </Box>
        </Typography>
      }
    >
      <form onSubmit={submit}>
        <Stack spacing={2.25}>
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@yourgym.com"
            autoComplete="email"
            required
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Mail size={15} />
                  </InputAdornment>
                ),
              },
            }}
          />
          <TextField
            fullWidth
            label="Password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock size={15} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      onClick={() => setShowPassword((current) => !current)}
                      edge="end"
                      size="small"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />
          {error ? <Alert severity="error">{error}</Alert> : null}
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={busy}
            endIcon={busy ? undefined : <ArrowRight size={16} />}
            sx={{ mt: 0.5, minHeight: 48, fontSize: 14 }}
          >
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </Stack>
      </form>

      <Divider sx={{ my: 2.5 }} />

      <Stack direction="row" alignItems="baseline" justifyContent="space-between" sx={{ mb: 1.25 }}>
        <Typography variant="overline" sx={{ color: "text.secondary" }}>
          Demo accounts
        </Typography>
        <Typography variant="caption" sx={{ color: "text.disabled" }}>
          password123
        </Typography>
      </Stack>
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
        {DEMO_ACCOUNTS.map((account) => (
          <Button
            key={account.email}
            variant="outlined"
            size="small"
            onClick={() => useDemo(account.email)}
            sx={{
              justifyContent: "flex-start",
              gap: 1,
              py: 0.9,
              fontSize: 12,
              fontWeight: 600,
              textTransform: "none",
              borderColor: "divider",
              color: "text.primary",
            }}
          >
            <Box
              sx={{
                display: "grid",
                placeItems: "center",
                width: 22,
                height: 22,
                borderRadius: "50%",
                backgroundColor: "action.selected",
                color: "primary.main",
                fontSize: 10,
                fontWeight: 700,
              }}
            >
              {account.label.charAt(0)}
            </Box>
            {account.label}
          </Button>
        ))}
      </Box>
    </AuthShell>
  );
}
