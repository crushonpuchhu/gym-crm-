import { createTheme } from "@mui/material/styles";

export type ColorMode = "dark" | "light";

/**
 * GymFlow app theme.
 *
 * Two surfaces share one structure: a deep-navy dark mode and a cool paper
 * light mode. Accent hues live as CSS custom properties so charts, chips and
 * card glows can read them from plain CSS strings and follow the mode switch.
 * The marketing landing page keeps its own palette either way.
 */

interface Tokens {
  bg: string;
  bgGlow: string;
  paper: string;
  paperBorder: string;
  text: string;
  textSecondary: string;
  textDisabled: string;
  divider: string;
  primary: string;
  primaryHover: string;
  primaryText: string;
  primarySoft: string;
  secondary: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  hover: string;
  selected: string;
  input: string;
  inputBorder: string;
  menu: string;
  menuBorder: string;
  dialog: string;
  drawer: string;
  tooltipBg: string;
  tooltipText: string;
  rail: string;
  header: string;
  chipBg: string;
  chipText: string;
  borderStrong: string;
  wash: string;
  washStrong: string;
  accentBorder: string;
  chartBarBottom: string;
  chartBar: string;
  chartLine: string;
  chartDot: string;
  navActive: string;
  navActiveText: string;
  navActiveIcon: string;
  chipSolid: Record<string, string>;
  chipSolidText: string;
  tone: Record<string, { main: string; soft: string; glow: string }>;
  seriesExtra: [string, string, string];
  chartAxis: string;
  chartGrid: string;
  chartCursor: string;
  chartTooltipBg: string;
  chartTooltipBorder: string;
  chartTooltipText: string;
}

const tones = (set: Record<string, string>, alpha: number) =>
  Object.fromEntries(
    Object.entries(set).map(([name, main]) => [
      name,
      {
        main,
        soft: hexToRgba(main, alpha),
        glow: hexToRgba(main, Math.min(alpha + 0.06, 0.4)),
      },
    ]),
  ) as Tokens["tone"];

function hexToRgba(hex: string, alpha: number) {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const DARK: Tokens = {
  bg: "#04060f",
  bgGlow:
    "radial-gradient(1100px 640px at 8% -14%, rgba(75,124,242,0.18), transparent 62%), radial-gradient(880px 520px at 92% -6%, rgba(139,108,232,0.14), transparent 58%), radial-gradient(760px 520px at 60% 108%, rgba(16,62,160,0.16), transparent 62%)",
  paper: "#0a101d",
  paperBorder: "rgba(140, 165, 220, 0.14)",
  text: "#eef2fb",
  textSecondary: "#909db6",
  textDisabled: "#566076",
  divider: "rgba(140, 165, 220, 0.14)",
  primary: "#3f6fe0",
  primaryHover: "#3a67d6",
  primaryText: "#ffffff",
  primarySoft: "rgba(75, 124, 242, 0.16)",
  secondary: "#8b6ce8",
  success: "#56bd77",
  warning: "#eda23c",
  error: "#e06d92",
  info: "#74aee8",
  hover: "rgba(140, 165, 220, 0.08)",
  selected: "rgba(75, 124, 242, 0.16)",
  input: "#0c1424",
  inputBorder: "rgba(140, 165, 220, 0.18)",
  menu: "#101a2e",
  menuBorder: "rgba(140, 165, 220, 0.18)",
  dialog: "#0b1220",
  drawer: "#050912",
  tooltipBg: "#101a2e",
  tooltipText: "#eef2fb",
  rail: "rgba(8, 11, 20, 0.72)",
  header: "rgba(7, 10, 18, 0.78)",
  chipBg: "rgba(140, 165, 220, 0.12)",
  chipText: "#dbe4f7",
  borderStrong: "rgba(140, 165, 220, 0.24)",
  wash: "rgba(140, 165, 220, 0.08)",
  washStrong: "rgba(140, 165, 220, 0.12)",
  accentBorder: "rgba(75, 124, 242, 0.6)",
  chartBarBottom: "#3e71ec",
  chartBar: "#5b8cf5",
  chartLine: "#5b8cf5",
  chartDot: "#74aee8",
  navActive: "rgba(75, 124, 242, 0.16)",
  navActiveText: "#e4ecff",
  navActiveIcon: "#74aee8",
  chipSolid: {
    indigo: "rgba(91, 140, 245, 0.16)",
    violet: "rgba(139, 108, 232, 0.16)",
    cyan: "rgba(116, 174, 232, 0.16)",
    emerald: "rgba(86, 189, 119, 0.16)",
    amber: "rgba(237, 162, 60, 0.16)",
    rose: "rgba(224, 109, 146, 0.16)",
  },
  chipSolidText: "#eef2fb",
  tone: tones(
    {
      indigo: "#5b8cf5",
      violet: "#8b6ce8",
      cyan: "#74aee8",
      emerald: "#56bd77",
      amber: "#eda23c",
      rose: "#e06d92",
    },
    0.16,
  ),
  seriesExtra: ["#a9c2ff", "#8fd9a8", "#f6c98b"],
  chartAxis: "#8c99b4",
  chartGrid: "rgba(140, 165, 220, 0.12)",
  chartCursor: "rgba(91, 140, 245, 0.08)",
  chartTooltipBg: "#101a2e",
  chartTooltipBorder: "rgba(140, 165, 220, 0.22)",
  chartTooltipText: "#eef2fb",
};

const LIGHT: Tokens = {
  // Reference: airy blue-grey desk, white surfaces, one solid blue accent.
  bg: "#e8eef6",
  bgGlow: "none",
  paper: "#ffffff",
  paperBorder: "#edf0f5",
  text: "#111827",
  textSecondary: "#6b7280",
  textDisabled: "#9aa1ad",
  divider: "#eef1f5",
  primary: "#2566f9",
  primaryHover: "#1a55e0",
  primaryText: "#ffffff",
  primarySoft: "rgba(37, 102, 249, 0.1)",
  secondary: "#7c3aed",
  success: "#059669",
  warning: "#ea580c",
  error: "#dc2626",
  info: "#2563eb",
  hover: "#f5f7fb",
  selected: "rgba(37, 102, 249, 0.08)",
  input: "#ffffff",
  inputBorder: "#dfe5ef",
  menu: "#ffffff",
  menuBorder: "#e6eaf1",
  dialog: "#ffffff",
  drawer: "#ffffff",
  tooltipBg: "#111827",
  tooltipText: "#f8fafc",
  rail: "#ffffff",
  header: "rgba(255, 255, 255, 0.92)",
  chipBg: "#f1f4f9",
  chipText: "#374151",
  borderStrong: "#e2e8f0",
  wash: "#f6f8fb",
  washStrong: "#eff3f9",
  accentBorder: "rgba(37, 102, 249, 0.5)",
  chartBarBottom: "#10b981",
  chartBar: "#10b981",
  chartLine: "#3b82f6",
  chartDot: "#3b82f6",
  navActive: "#2566f9",
  navActiveText: "#ffffff",
  navActiveIcon: "#ffffff",
  chipSolid: {
    indigo: "#2f6bf6",
    violet: "#ae47ff",
    cyan: "#0d9488",
    emerald: "#10b981",
    amber: "#f97316",
    rose: "#ef4444",
  },
  chipSolidText: "#ffffff",
  tone: tones(
    {
      indigo: "#2563eb",
      violet: "#7c3aed",
      cyan: "#0f766e",
      emerald: "#047857",
      amber: "#c2410c",
      rose: "#dc2626",
    },
    0.12,
  ),
  seriesExtra: ["#93b4f8", "#6ee7b7", "#fdba74"],
  chartAxis: "#7d8695",
  chartGrid: "#eef1f5",
  chartCursor: "rgba(37, 102, 249, 0.06)",
  chartTooltipBg: "#ffffff",
  chartTooltipBorder: "#e6eaf1",
  chartTooltipText: "#111827",
};

function cssVars(t: Tokens) {
  const vars: Record<string, string> = {
    "--gf-tone-indigo": t.tone.indigo.main,
    "--gf-tone-violet": t.tone.violet.main,
    "--gf-tone-cyan": t.tone.cyan.main,
    "--gf-tone-emerald": t.tone.emerald.main,
    "--gf-tone-amber": t.tone.amber.main,
    "--gf-tone-rose": t.tone.rose.main,
    "--gf-series-7": t.seriesExtra[0],
    "--gf-series-8": t.seriesExtra[1],
    "--gf-series-9": t.seriesExtra[2],
    "--gf-chart-axis": t.chartAxis,
    "--gf-chart-grid": t.chartGrid,
    "--gf-chart-cursor": t.chartCursor,
    "--gf-chart-tooltip-bg": t.chartTooltipBg,
    "--gf-chart-tooltip-border": t.chartTooltipBorder,
    "--gf-chart-tooltip-text": t.chartTooltipText,
    "--gf-rail": t.rail,
    "--gf-header": t.header,
    "--gf-paper": t.paper,
    "--gf-border": t.divider,
    "--gf-border-strong": t.borderStrong,
    "--gf-wash": t.wash,
    "--gf-wash-strong": t.washStrong,
    "--gf-accent": t.primary,
    "--gf-accent-border": t.accentBorder,
    "--gf-chart-bar-bottom": t.chartBarBottom,
    "--gf-chart-bar": t.chartBar,
    "--gf-chart-line": t.chartLine,
    "--gf-chart-dot": t.chartDot,
    "--gf-nav-active": t.navActive,
    "--gf-nav-active-text": t.navActiveText,
    "--gf-chip-solid-text": t.chipSolidText,
  };
  for (const [name, value] of Object.entries(t.chipSolid)) {
    vars[`--gf-chip-${name}`] = value;
  }
  for (const [name, value] of Object.entries(t.tone)) {
    vars[`--gf-tone-${name}-soft`] = value.soft;
    vars[`--gf-tone-${name}-glow`] = value.glow;
  }
  return vars;
}

export function createAppTheme(mode: ColorMode) {
  const t = mode === "dark" ? DARK : LIGHT;

  return createTheme({
    palette: {
      mode,
      background: { default: t.bg, paper: t.paper },
      divider: t.divider,
      text: { primary: t.text, secondary: t.textSecondary, disabled: t.textDisabled },
      primary: { main: t.primary, light: t.info, dark: t.primaryHover, contrastText: t.primaryText },
      secondary: { main: t.secondary, contrastText: "#ffffff" },
      success: { main: t.success },
      warning: { main: t.warning },
      error: { main: t.error },
      info: { main: t.info },
      action: {
        hover: t.hover,
        selected: t.selected,
        disabled: mode === "dark" ? "rgba(140, 165, 220, 0.3)" : "rgba(16, 40, 84, 0.26)",
        disabledBackground: t.hover,
      },
    },
    shape: { borderRadius: 14 },
    typography: {
      fontFamily:
        'Inter, "Geist", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      h1: { fontSize: 26, fontWeight: 700, letterSpacing: "-0.025em" },
      h2: { fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" },
      h3: { fontSize: 18, fontWeight: 650, letterSpacing: "-0.015em" },
      h4: { fontSize: 16, fontWeight: 600 },
      h5: { fontSize: 14, fontWeight: 600 },
      h6: { fontSize: 13, fontWeight: 600 },
      body1: { fontSize: 14 },
      body2: { fontSize: 13 },
      caption: { fontSize: 11.5, letterSpacing: "0.01em" },
      overline: {
        fontSize: 10.5,
        fontWeight: 600,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
      },
      button: { textTransform: "none", fontWeight: 600, fontSize: 13 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          html: {
            backgroundColor: t.bg,
            ...cssVars(t),
          },
          body: {
            backgroundColor: t.bg,
            color: t.text,
            backgroundImage: t.bgGlow,
            backgroundAttachment: "fixed",
            "& ::selection": { backgroundColor: hexToRgba(t.primary, 0.35) },
          },
        },
      },
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            backgroundColor: t.paper,
            backgroundImage: "none",
            border: `1px solid ${t.paperBorder}`,
          },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { borderRadius: 10, paddingInline: 16, minHeight: 36 },
          sizeSmall: { minHeight: 30, paddingInline: 12, fontSize: 12 },
          contained: {
            backgroundColor: t.primary,
            color: t.primaryText,
            "&:hover": { backgroundColor: t.primaryHover },
          },
          outlined: {
            borderColor: mode === "dark" ? "rgba(140,165,220,0.24)" : "rgba(16,40,84,0.18)",
            color: t.text,
            "&:hover": {
              borderColor: hexToRgba(t.primary, 0.6),
              backgroundColor: t.primarySoft,
              color: mode === "dark" ? "#cfdcff" : "#26509e",
            },
          },
          text: {
            color: t.text,
            "&:hover": {
              backgroundColor: t.primarySoft,
              color: mode === "dark" ? "#cfdcff" : "#26509e",
            },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            color: t.textSecondary,
            "&:hover": { backgroundColor: t.primarySoft, color: mode === "dark" ? "#abc5f3" : "#2a55a8" },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: { borderColor: t.divider, padding: "13px 16px" },
          head: {
            fontSize: 10.5,
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: t.textSecondary,
            backgroundColor: "transparent",
            borderBottom: `1px solid ${t.divider}`,
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            "&:last-child td": { borderBottom: "none" },
            "&:hover": { backgroundColor: hexToRgba(t.primary, 0.05) },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 999,
            height: 24,
            fontSize: 10.5,
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            backgroundColor: t.chipBg,
            color: t.chipText,
            border: `1px solid ${t.paperBorder}`,
          },
          outlined: { backgroundColor: "transparent" },
          label: { paddingInline: 10 },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            backgroundColor: t.input,
            borderRadius: 10,
            fontSize: 13.5,
            "& .MuiOutlinedInput-notchedOutline": { borderColor: t.inputBorder },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: mode === "dark" ? "rgba(140,165,220,0.32)" : "rgba(16,40,84,0.3)",
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: hexToRgba(t.primary, 0.8),
              borderWidth: 1,
            },
          },
          input: {
            padding: "10px 12px",
            "&.MuiOutlinedInput-inputSizeSmall": { padding: "8px 10px" },
          },
        },
      },
      MuiInputLabel: { styleOverrides: { root: { fontSize: 13, color: t.textSecondary } } },
      MuiFormLabel: {
        styleOverrides: {
          root: {
            fontSize: 12.5,
            color: t.textSecondary,
            "&.Mui-focused": { color: mode === "dark" ? "#abc5f3" : t.primary },
          },
        },
      },
      MuiSelect: { styleOverrides: { select: { paddingTop: 9, paddingBottom: 9 } } },
      MuiMenu: {
        styleOverrides: {
          paper: {
            backgroundColor: t.menu,
            border: `1px solid ${t.menuBorder}`,
            borderRadius: 12,
            marginTop: 6,
            backgroundImage: "none",
            boxShadow:
              mode === "dark" ? "0 24px 48px rgba(0,0,0,0.45)" : "0 20px 40px rgba(16,40,84,0.14)",
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            fontSize: 13,
            borderRadius: 8,
            marginInline: 6,
            "&.Mui-selected": {
              backgroundColor: t.selected,
              "&:hover": { backgroundColor: hexToRgba(t.primary, 0.22) },
            },
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundColor: t.dialog,
            borderRadius: 20,
            border: `1px solid ${t.paperBorder}`,
            backgroundImage: "none",
          },
        },
      },
      MuiDialogTitle: {
        styleOverrides: { root: { fontSize: 17, fontWeight: 650, letterSpacing: "-0.01em" } },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: t.tooltipBg,
            color: t.tooltipText,
            fontSize: 11.5,
            fontWeight: 600,
            borderRadius: 8,
            border: `1px solid ${mode === "dark" ? "rgba(140,165,220,0.2)" : "transparent"}`,
          },
          arrow: { color: t.tooltipBg },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            minHeight: 42,
            color: t.textSecondary,
            "&.Mui-selected": {
              backgroundColor: t.navActive,
              color: t.navActiveText,
              boxShadow: mode === "light" ? "0 6px 14px rgba(37, 102, 249, 0.24)" : "none",
              "& .MuiListItemIcon-root": { color: t.navActiveIcon },
              "&:hover": { backgroundColor: mode === "light" ? t.primaryHover : hexToRgba(t.primary, 0.22) },
            },
          },
        },
      },
      MuiListItemIcon: { styleOverrides: { root: { minWidth: 34, color: "inherit" } } },
      MuiListItemText: { styleOverrides: { primary: { fontSize: 13.5, fontWeight: 550 } } },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: t.drawer,
            border: "none",
            borderRight: `1px solid ${t.divider}`,
            backgroundImage: "none",
          },
        },
      },
      MuiToggleButtonGroup: {
        styleOverrides: {
          root: {
            backgroundColor: t.input,
            border: `1px solid ${t.paperBorder}`,
            borderRadius: 999,
            padding: 3,
            gap: 2,
          },
        },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            border: "none",
            borderRadius: 999,
            textTransform: "none",
            fontSize: 12,
            fontWeight: 600,
            color: t.textSecondary,
            paddingInline: 12,
            paddingBlock: 4,
            "&.Mui-selected": {
              backgroundColor: t.primary,
              color: t.primaryText,
              "&:hover": { backgroundColor: t.primaryHover },
            },
          },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: {
            backgroundColor: mode === "dark" ? "rgba(140,165,220,0.1)" : "rgba(16,40,84,0.08)",
            borderRadius: 999,
            height: 6,
          },
          bar: {
            backgroundImage: `linear-gradient(90deg, ${t.primary} 0%, ${t.secondary} 100%)`,
            borderRadius: 999,
          },
        },
      },
      MuiSkeleton: {
        styleOverrides: {
          root: { backgroundColor: mode === "dark" ? "rgba(140,165,220,0.1)" : "rgba(16,40,84,0.07)" },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            fontSize: 13,
            border: `1px solid ${t.paperBorder}`,
            "&.MuiAlert-standardError, &.MuiAlert-standardSuccess, &.MuiAlert-standardInfo, &.MuiAlert-standardWarning": {
              backgroundColor: t.hover,
              color: t.text,
            },
          },
        },
      },
      MuiDivider: { styleOverrides: { root: { borderColor: t.divider } } },
      MuiAvatar: {
        styleOverrides: {
          root: {
            backgroundImage: `linear-gradient(135deg, ${t.primary} 0%, ${t.secondary} 100%)`,
            color: "#ffffff",
            fontWeight: 600,
          },
        },
      },
      MuiTabs: { styleOverrides: { indicator: { backgroundColor: t.primary, height: 2 } } },
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: "none",
            fontSize: 13,
            fontWeight: 600,
            color: t.textSecondary,
            "&.Mui-selected": { color: mode === "dark" ? "#abc5f3" : t.primary },
          },
        },
      },
      MuiBadge: {
        styleOverrides: { badge: { backgroundColor: t.primary, color: t.primaryText, fontWeight: 700 } },
      },
      MuiSwitch: {
        styleOverrides: {
          root: {
            "& .MuiSwitch-switchBase.Mui-checked": { color: t.primary },
            "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: t.primary },
          },
          track: {
            backgroundColor: mode === "dark" ? "rgba(140,165,220,0.24)" : "rgba(16,40,84,0.22)",
          },
        },
      },
      MuiFormControlLabel: {
        styleOverrides: {
          label: { fontSize: 13, color: mode === "dark" ? "#c6d0e6" : "#2a3a58" },
        },
      },
      MuiCheckbox: {
        styleOverrides: {
          root: {
            color: mode === "dark" ? "rgba(140,165,220,0.45)" : "rgba(16,40,84,0.34)",
            "&.Mui-checked": { color: t.primary },
          },
        },
      },
      MuiRadio: {
        styleOverrides: {
          root: {
            color: mode === "dark" ? "rgba(140,165,220,0.45)" : "rgba(16,40,84,0.34)",
            "&.Mui-checked": { color: t.primary },
          },
        },
      },
      MuiTablePagination: { styleOverrides: { root: { color: t.textSecondary, fontSize: 12 } } },
    },
  });
}
