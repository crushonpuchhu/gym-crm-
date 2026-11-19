"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from "@mui/material";
import { Stack } from "@/components/mui-stack";
import { ArrowRight, Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ColorModeProvider } from "@/components/color-mode";
import { AuthShell } from "@/components/auth-shell";
import { roleLabel } from "@/lib/roles";

interface InvitePreview {
  email: string;
  role: string;
  organization: { id: string; name: string; slug: string };
  expiresAt: string;
  existingAccount: boolean;
  suggestedName: string;
}

export default function InvitePage() {
  return (
    <ColorModeProvider>
      <InviteView />
    </ColorModeProvider>
  );
}

function InviteView() {
  const params = useParams<{ token: string }>();
  const token = params?.token ?? "";
  const router = useRouter();
  const { acceptInvitation } = useAuth();
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [loadError, setLoadError] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    let alive = true;
    fetch(`/api/v1/auth/invitations/${token}`, { credentials: "include" })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body?.error?.message || "This invitation is not valid");
        return body.data as InvitePreview;
      })
      .then((data) => {
        if (!alive) return;
        setPreview(data);
        setName(data.suggestedName || "");
      })
      .catch((err) => alive && setLoadError(err?.message || "This invitation is not valid"));
    return () => {
      alive = false;
    };
  }, [token]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await acceptInvitation(token, {
        name: preview?.existingAccount ? undefined : name,
        password,
      });
      router.replace("/dashboard");
    } catch (err: any) {
      setError(err?.message || "Could not join this gym brand");
    } finally {
      setBusy(false);
    }
  };

  if (loadError) {
    return (
      <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", px: 2 }}>
        <Box sx={{ maxWidth: 420, textAlign: "center" }}>
          <Typography variant="h2" sx={{ mb: 1 }}>Invitation unavailable</Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {loadError}. Ask the gym owner to send a new invitation.
          </Typography>
          <Button component={Link} href="/login" variant="outlined" sx={{ mt: 2.5 }}>
            Back to sign in
          </Button>
        </Box>
      </Box>
    );
  }

  if (!preview) {
    return (
      <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <CircularProgress size={26} thickness={4.5} />
      </Box>
    );
  }

  return (
    <AuthShell
      eyebrow="Staff invitation"
      headline={`Join ${preview.organization.name} on GymFlow.`}
      points={[
        "Your own login — never the owner's credentials.",
        `Access is limited to ${preview.organization.name}. Other gym brands stay invisible.`,
        `You join as ${roleLabel(preview.role)} and the owner can adjust it later.`,
      ]}
      title={preview.existingAccount ? "Join this gym brand" : "Create your staff login"}
      subtitle={
        preview.existingAccount
          ? `${preview.email} already has a GymFlow login. Enter its password to add this brand to your account.`
          : `Set a password for ${preview.email} and start working in ${preview.organization.name}.`
      }
      footer={
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          Not you?{" "}
          <Box component={Link} href="/login" sx={{ color: "primary.main", fontWeight: 600, textDecoration: "none" }}>
            Sign in with another account
          </Box>
        </Typography>
      }
    >
      <form onSubmit={submit}>
        <Stack spacing={2.25}>
          <TextField fullWidth label="Work email" value={preview.email} disabled slotProps={{ input: { startAdornment: <InputAdornment position="start"><Mail size={15} /></InputAdornment> } }} />
          {!preview.existingAccount ? (
            <TextField
              fullWidth
              label="Your name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Avery Chen"
              autoComplete="name"
              required
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><User size={15} /></InputAdornment> } }}
            />
          ) : null}
          <TextField
            fullWidth
            label={preview.existingAccount ? "Existing password" : "Create a password"}
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={preview.existingAccount ? "current-password" : "new-password"}
            helperText={preview.existingAccount ? undefined : "At least 8 characters"}
            required
            sx={{ "& .MuiFormHelperText-root": { mx: 0.5, fontSize: 11 } }}
            slotProps={{
              htmlInput: { minLength: 8 },
              input: {
                startAdornment: <InputAdornment position="start"><Lock size={15} /></InputAdornment>,
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
            {busy ? "Joining…" : `Join as ${roleLabel(preview.role)}`}
          </Button>
        </Stack>
      </form>
    </AuthShell>
  );
}
