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
import { ArrowRight, Building2, Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ColorModeProvider } from "@/components/color-mode";
import { AuthShell } from "@/components/auth-shell";

export default function RegisterPage() {
  return (
    <ColorModeProvider>
      <RegisterView />
    </ColorModeProvider>
  );
}

function RegisterView() {
  const { register, user, loading } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "", name: "", organizationName: "" });
  const [showPassword, setShowPassword] = useState(false);
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
      <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <CircularProgress size={26} thickness={4.5} />
      </Box>
    );
  }

  return (
    <AuthShell
      eyebrow="Start in minutes"
      headline="Your first club, set up today."
      points={[
        "Create a workspace, add a club and a membership plan.",
        "Import prospects and move them through one pipeline.",
        "Invite staff with roles for front desk, coaching and owners.",
      ]}
      title="Create your workspace"
      subtitle="Set up a GymFlow workspace for your gym brand."
      footer={
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          Have an account?{" "}
          <Box component={Link} href="/login" sx={{ color: "primary.main", fontWeight: 600, textDecoration: "none" }}>
            Sign in
          </Box>
        </Typography>
      }
    >
      <form onSubmit={submit}>
        <Stack spacing={2.25}>
          <TextField
            fullWidth
            label="Gym brand name"
            value={form.organizationName}
            onChange={setField("organizationName")}
            placeholder="Iron Atlas"
            required
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Building2 size={15} />
                  </InputAdornment>
                ),
              },
            }}
          />
          <TextField
            fullWidth
            label="Your name"
            value={form.name}
            onChange={setField("name")}
            placeholder="Avery Chen"
            autoComplete="name"
            required
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <User size={15} />
                  </InputAdornment>
                ),
              },
            }}
          />
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={form.email}
            onChange={setField("email")}
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
            value={form.password}
            onChange={setField("password")}
            autoComplete="new-password"
            helperText="At least 8 characters"
            required
            sx={{ "& .MuiFormHelperText-root": { mx: 0.5, fontSize: 11 } }}
            slotProps={{
              htmlInput: { minLength: 8 },
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
            {busy ? "Creating…" : "Create gym workspace"}
          </Button>
        </Stack>
      </form>

      <Divider sx={{ my: 2.5 }} />

      <Typography variant="caption" sx={{ color: "text.disabled", display: "block", lineHeight: 1.6 }}>
        You will be the workspace owner. Clubs, plans and staff roles are set up inside the app.
      </Typography>
    </AuthShell>
  );
}
