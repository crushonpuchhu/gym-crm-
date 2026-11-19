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
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon?: LucideIcon;
}) {
  return (
    <Paper sx={{ borderRadius: 3, p: 2.5, height: "100%" }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
        <Box>
          <Typography variant="overline" sx={{ color: "text.secondary" }}>
            {label}
          </Typography>
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
              border: "1px solid rgba(255,255,255,0.1)",
              color: "text.secondary",
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

const STRONG = new Set(["ACTIVE", "JOINED", "WON", "OPEN", "RESOLVED", "CONVERTED"]);
const MID = new Set([
  "NEW",
  "CONTACTED",
  "TOUR_BOOKED",
  "TOURED",
  "TRIAL",
  "NEGOTIATING",
  "PENDING",
  "IN_PROGRESS",
  "PAUSED",
]);

export function StatusChip({ status }: { status: string }) {
  const key = status.toUpperCase();
  const strong = STRONG.has(key);
  return (
    <Chip
      label={status.replaceAll("_", " ")}
      size="small"
      sx={
        strong
          ? { backgroundColor: "#f5f5f6", color: "#0a0a0b", borderColor: "#f5f5f6" }
          : MID.has(key)
            ? { backgroundColor: "rgba(255,255,255,0.12)", color: "#f5f5f6" }
            : { backgroundColor: "transparent", color: "text.secondary" }
      }
    />
  );
}

export function PriorityChip({ priority }: { priority: string }) {
  const key = priority.toUpperCase();
  const strength = key === "URGENT" ? 2 : key === "HIGH" ? 1 : 0;
  return (
    <Chip
      label={priority}
      size="small"
      sx={
        strength === 2
          ? { backgroundColor: "#f5f5f6", color: "#0a0a0b", borderColor: "#f5f5f6" }
          : strength === 1
            ? { backgroundColor: "rgba(255,255,255,0.12)" }
            : { backgroundColor: "transparent", color: "text.secondary" }
      }
    />
  );
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
    <Paper sx={{ borderRadius: 3, p: 4, textAlign: "center", borderColor: "rgba(255,255,255,0.16)" }}>
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
      sx={{ px: 2, py: 1.5, borderTop: "1px solid rgba(255,255,255,0.08)" }}
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
