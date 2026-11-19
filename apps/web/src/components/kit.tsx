"use client";

import { ReactNode } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Skeleton,
  TextField,
  TextFieldProps,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { Stack } from "@/components/mui-stack";
import { TONES, type ToneName, toneAt } from "@/palette";
import { LucideIcon, X } from "lucide-react";

/* Page furniture ---------------------------------------------------------- */

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      alignItems={{ xs: "flex-start", sm: "center" }}
      justifyContent="space-between"
      spacing={2}
      sx={{ mb: 3 }}
    >
      <Box>
        <Typography variant="h1">{title}</Typography>
        {subtitle ? (
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
            {subtitle}
          </Typography>
        ) : null}
      </Box>
      {actions ? <Stack direction="row" spacing={1} flexWrap="wrap">{actions}</Stack> : null}
    </Stack>
  );
}

export function Panel({
  children,
  sx,
  padded = true,
}: {
  children: ReactNode;
  sx?: object;
  padded?: boolean;
}) {
  return (
    <Paper sx={{ borderRadius: 3, p: padded ? 2.5 : 0, ...sx }}>{children}</Paper>
  );
}

export function PanelHeading({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2} sx={{ mb: 2 }}>
      <Box>
        <Typography variant="overline" sx={{ color: "text.secondary" }}>
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="h3" sx={{ mt: 0.25 }}>
            {subtitle}
          </Typography>
        ) : null}
      </Box>
      {actions}
    </Stack>
  );
}

/* Metrics ----------------------------------------------------------------- */

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone,
  index = 0,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon?: LucideIcon;
  tone?: ToneName;
  index?: number;
}) {
  const accent = TONES[tone ?? toneAt(index)];
  return (
    <Paper
      sx={{
        borderRadius: 3,
        p: 2.5,
        height: "100%",
        position: "relative",
        overflow: "hidden",
        backgroundImage: `radial-gradient(360px 180px at 104% -30%, ${accent.glow}, transparent 70%)`,
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
        <Box>
          <Stack direction="row" spacing={0.75} alignItems="center">
            <Box sx={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: accent.main, flexShrink: 0 }} />
            <Typography variant="overline" sx={{ color: "text.secondary" }}>
              {label}
            </Typography>
          </Stack>
          <Typography
            sx={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.03em", mt: 1, lineHeight: 1.1 }}
          >
            {value}
          </Typography>
          {sub ? (
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 1 }}>
              {sub}
            </Typography>
          ) : null}
        </Box>
        {Icon ? (
          <Box
            sx={{
              display: "grid",
              placeItems: "center",
              width: 38,
              height: 38,
              borderRadius: 2,
              backgroundColor: accent.soft,
              boxShadow: `inset 0 0 0 1px ${accent.soft}`,
              color: accent.main,
              flexShrink: 0,
            }}
          >
            <Icon size={18} strokeWidth={1.8} />
          </Box>
        ) : null}
      </Stack>
    </Paper>
  );
}

/* Status ------------------------------------------------------------------ */

const STATUS_TONE: Record<string, ToneName | "neutral"> = {
  ACTIVE: "emerald",
  JOINED: "emerald",
  WON: "emerald",
  RESOLVED: "emerald",
  CONVERTED: "emerald",
  COMPLETED: "emerald",
  AVAILABLE: "emerald",
  TRIAL: "amber",
  PENDING: "amber",
  NEW: "indigo",
  CONTACTED: "indigo",
  IN_PROGRESS: "indigo",
  OPEN: "indigo",
  TOUR_BOOKED: "cyan",
  TOURED: "cyan",
  NEGOTIATING: "violet",
  PAUSED: "violet",
  CURRENT: "indigo",
  "NEAR LIMIT": "amber",
  SUBSCRIBED: "emerald",
  CANCELLED: "rose",
  EXPIRED: "rose",
  LOST: "rose",
  FAILED: "rose",
  URGENT: "rose",
  HIGH: "amber",
  MEDIUM: "indigo",
  LOW: "neutral",
};

/** Tinted pill with a hue dot; unknown states stay neutral rather than inventing a colour. */
function TonePill({ label, name }: { label: string; name: ToneName | "neutral" }) {
  if (name === "neutral") {
    return <Chip label={label} size="small" sx={{ backgroundColor: "transparent", color: "text.secondary" }} />;
  }
  const accent = TONES[name];
  return (
    <Chip
      label={
        <Stack direction="row" spacing={0.75} alignItems="center">
          <Box sx={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: accent.main }} />
          <Box component="span">{label}</Box>
        </Stack>
      }
      size="small"
      sx={{
        backgroundColor: accent.soft,
        color: accent.main,
        boxShadow: `inset 0 0 0 1px ${accent.soft}`,
        "& .MuiChip-label": { paddingInline: 1 },
      }}
    />
  );
}

export function StatusChip({ status }: { status: string }) {
  const key = status.toUpperCase();
  return <TonePill label={status.replaceAll("_", " ")} name={STATUS_TONE[key] ?? "neutral"} />;
}

export function PriorityChip({ priority }: { priority: string }) {
  const key = priority.toUpperCase();
  return <TonePill label={priority} name={STATUS_TONE[key] ?? "neutral"} />;
}

/* Form -------------------------------------------------------------------- */

export function Field(props: TextFieldProps) {
  return <TextField fullWidth size="small" {...props} />;
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <ToggleButtonGroup
      size="small"
      exclusive
      value={value}
      onChange={(_event, next) => {
        if (next !== null) onChange(next as T);
      }}
    >
      {options.map((option) => (
        <ToggleButton key={option.value} value={option.value}>
          {option.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}

/* States ------------------------------------------------------------------ */

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <Paper sx={{ borderRadius: 3, p: 6, textAlign: "center" }}>
      <Typography sx={{ fontWeight: 600 }}>{title}</Typography>
      {hint ? (
        <Typography variant="body2" sx={{ color: "text.secondary", mt: 1, maxWidth: 380, mx: "auto" }}>
          {hint}
        </Typography>
      ) : null}
      {action ? <Box sx={{ mt: 2 }}>{action}</Box> : null}
    </Paper>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Paper sx={{ borderRadius: 3, p: 4, textAlign: "center", borderColor: "rgba(140,165,220,0.22)" }}>
      <Typography sx={{ fontWeight: 600 }}>{message}</Typography>
      {onRetry ? (
        <Button variant="outlined" size="small" sx={{ mt: 2 }} onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </Paper>
  );
}

export function LoadingSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Paper sx={{ borderRadius: 3, p: 2 }}>
      <Stack spacing={1.5}>
        {Array.from({ length: rows }).map((_, index) => (
          <Stack key={index} direction="row" spacing={2} alignItems="center">
            <Skeleton variant="circular" width={30} height={30} />
            <Skeleton variant="text" sx={{ flex: 1 }} />
            <Skeleton variant="text" width={80} />
          </Stack>
        ))}
      </Stack>
    </Paper>
  );
}

export function Modal({
  open,
  title,
  onClose,
  children,
  maxWidth = "sm",
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: "xs" | "sm" | "md" | "lg";
}) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth={maxWidth}>
      <DialogTitle sx={{ pr: 6 }}>
        {title}
        <IconButton
          aria-label="Close dialog"
          onClick={onClose}
          sx={{ position: "absolute", right: 12, top: 12 }}
        >
          <X size={18} />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pb: 3 }}>{children}</DialogContent>
    </Dialog>
  );
}

export function PaginationBar({
  page,
  pages,
  total,
  onPage,
}: {
  page: number;
  pages: number;
  total: number;
  onPage: (page: number) => void;
}) {
  const last = pages || 1;
  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      sx={{ px: 2, py: 1.5, borderTop: "1px solid rgba(140,165,220,0.12)" }}
    >
      <Typography variant="caption" sx={{ color: "text.secondary" }}>
        {total} records · page {page} of {last}
      </Typography>
      <Stack direction="row" spacing={1}>
        <Button size="small" variant="outlined" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Prev
        </Button>
        <Button size="small" variant="outlined" disabled={page >= last} onClick={() => onPage(page + 1)}>
          Next
        </Button>
      </Stack>
    </Stack>
  );
}

export function TableShell({ children }: { children: ReactNode }) {
  return (
    <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
      <Box sx={{ overflowX: "auto" }}>{children}</Box>
    </Paper>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <TextField select fullWidth size="small" label={label} value={value} onChange={(event) => onChange(event.target.value)}>
      {options.map((option) => (
        <MenuItem key={option} value={option}>
          {option.replaceAll("_", " ")}
        </MenuItem>
      ))}
    </TextField>
  );
}
