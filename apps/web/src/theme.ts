import { createTheme } from "@mui/material/styles";

/**
 * GymFlow app theme — near-black ground with a six-hue accent set.
 *
 * Neutrals stay quiet (near-black grounds, white text, hairline dividers) and
 * colour arrives through accents derived from the indigo seed: indigo for
 * primary action, cyan/emerald/amber/rose for data and status. The marketing
 * landing page keeps its own paper palette.
 */
export const theme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: "#08080a",
      paper: "#111114",
    },
    divider: "rgba(255, 255, 255, 0.09)",
    text: {
      primary: "#f5f5f6",
      secondary: "#94949c",
      disabled: "#5b5b64",
    },
    primary: {
      main: "#7786f8",
      light: "#a3acff",
      dark: "#5b68d8",
      contrastText: "#0a0a0b",
    },
    secondary: {
      main: "#b584f5",
      contrastText: "#0a0a0b",
    },
    success: { main: "#45d39f" },
    warning: { main: "#f7c04a" },
    error: { main: "#f06a93" },
    info: { main: "#53d3ea" },
    action: {
      hover: "rgba(255, 255, 255, 0.06)",
      selected: "rgba(255, 255, 255, 0.09)",
      disabled: "rgba(255, 255, 255, 0.28)",
      disabledBackground: "rgba(255, 255, 255, 0.05)",
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
        body: {
          backgroundColor: "#08080a",
          backgroundImage:
            "radial-gradient(1100px 640px at 8% -14%, rgba(119,134,248,0.16), transparent 62%), radial-gradient(880px 520px at 92% -6%, rgba(181,132,245,0.13), transparent 58%), radial-gradient(760px 520px at 60% 108%, rgba(83,211,234,0.07), transparent 62%)",
          backgroundAttachment: "fixed",
          "& ::selection": { backgroundColor: "rgba(119,134,248,0.35)" },
        },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundImage: "none",
          border: "1px solid rgba(255, 255, 255, 0.08)",
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 10, paddingInline: 16, minHeight: 36 },
        sizeSmall: { minHeight: 30, paddingInline: 12, fontSize: 12 },
        contained: {
          backgroundImage: "linear-gradient(135deg, #7786f8 0%, #9a89f8 100%)",
          color: "#0a0a0b",
          "&:hover": {
            backgroundImage: "linear-gradient(135deg, #8b98ff 0%, #ab9bff 100%)",
          },
        },
        outlined: {
          borderColor: "rgba(255,255,255,0.16)",
          color: "#f5f5f6",
          "&:hover": {
            borderColor: "rgba(119,134,248,0.55)",
            backgroundColor: "rgba(119,134,248,0.1)",
            color: "#e3e6ff",
          },
        },
        text: {
          color: "#f5f5f6",
          "&:hover": { backgroundColor: "rgba(119,134,248,0.1)", color: "#e3e6ff" },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          color: "#b9b9c0",
          "&:hover": { backgroundColor: "rgba(119,134,248,0.14)", color: "#a3acff" },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: "rgba(255,255,255,0.07)", padding: "13px 16px" },
        head: {
          fontSize: 10.5,
          fontWeight: 600,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "#8d8d95",
          backgroundColor: "transparent",
          borderBottom: "1px solid rgba(255,255,255,0.09)",
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          "&:last-child td": { borderBottom: "none" },
          "&:hover": { backgroundColor: "rgba(119,134,248,0.05)" },
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
          backgroundColor: "rgba(255,255,255,0.08)",
          color: "#e6e6e9",
          border: "1px solid rgba(255,255,255,0.08)",
        },
        outlined: { backgroundColor: "transparent" },
        label: { paddingInline: 10 },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: "#17171b",
          borderRadius: 10,
          fontSize: 13.5,
          "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.12)" },
          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.24)" },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(119,134,248,0.75)",
            borderWidth: 1,
          },
        },
        input: {
          padding: "10px 12px",
          "&.MuiOutlinedInput-inputSizeSmall": { padding: "8px 10px" },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: { fontSize: 13, color: "#94949c" },
      },
    },
    MuiFormLabel: {
      styleOverrides: {
        root: { fontSize: 12.5, color: "#94949c", "&.Mui-focused": { color: "#a3acff" } },
      },
    },
    MuiSelect: {
      styleOverrides: { select: { paddingTop: 9, paddingBottom: 9 } },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          backgroundColor: "#151519",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 12,
          marginTop: 6,
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: { root: { fontSize: 13, borderRadius: 8, marginInline: 6 } },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: "#111115",
          borderRadius: 20,
          border: "1px solid rgba(255,255,255,0.1)",
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
          backgroundColor: "#f5f5f6",
          color: "#0a0a0b",
          fontSize: 11.5,
          fontWeight: 600,
          borderRadius: 8,
        },
        arrow: { color: "#f5f5f6" },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          minHeight: 42,
          color: "#a5a5ad",
          "&.Mui-selected": {
            backgroundColor: "rgba(119,134,248,0.16)",
            color: "#dfe3ff",
            "& .MuiListItemIcon-root": { color: "#a3acff" },
            "&:hover": { backgroundColor: "rgba(119,134,248,0.22)" },
          },
        },
      },
    },
    MuiListItemIcon: {
      styleOverrides: { root: { minWidth: 34, color: "inherit" } },
    },
    MuiListItemText: {
      styleOverrides: { primary: { fontSize: 13.5, fontWeight: 550 } },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: "#0c0c0f",
          border: "none",
          borderRight: "1px solid rgba(255,255,255,0.07)",
          backgroundImage: "none",
        },
      },
    },
    MuiToggleButtonGroup: {
      styleOverrides: {
        root: {
          backgroundColor: "#141418",
          border: "1px solid rgba(255,255,255,0.09)",
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
          color: "#8d8d95",
          paddingInline: 12,
          paddingBlock: 4,
          "&.Mui-selected": {
            backgroundImage: "linear-gradient(135deg, #7786f8 0%, #9a89f8 100%)",
            color: "#0a0a0b",
            "&:hover": { backgroundImage: "linear-gradient(135deg, #8b98ff 0%, #ab9bff 100%)" },
          },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 999, height: 6 },
        bar: {
          backgroundImage: "linear-gradient(90deg, #7786f8 0%, #b584f5 100%)",
          borderRadius: 999,
        },
      },
    },
    MuiSkeleton: {
      styleOverrides: {
        root: { backgroundColor: "rgba(255,255,255,0.07)" },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          fontSize: 13,
          border: "1px solid rgba(255,255,255,0.1)",
          "&.MuiAlert-standardError, &.MuiAlert-standardSuccess, &.MuiAlert-standardInfo, &.MuiAlert-standardWarning": {
            backgroundColor: "rgba(255,255,255,0.06)",
            color: "#f5f5f6",
          },
        },
      },
    },
    MuiDivider: { styleOverrides: { root: { borderColor: "rgba(255,255,255,0.08)" } } },
    MuiAvatar: {
      styleOverrides: {
        root: {
          backgroundImage: "linear-gradient(135deg, #4d59c9 0%, #7c5bd6 100%)",
          color: "#f5f5f6",
          fontWeight: 600,
        },
      },
    },
    MuiTabs: { styleOverrides: { indicator: { backgroundColor: "#7786f8", height: 2 } } },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontSize: 13,
          fontWeight: 600,
          color: "#8d8d95",
          "&.Mui-selected": { color: "#a3acff" },
        },
      },
    },
    MuiBadge: {
      styleOverrides: { badge: { backgroundColor: "#7786f8", color: "#0a0a0b", fontWeight: 700 } },
    },
    MuiSwitch: {
      styleOverrides: {
        root: {
          "& .MuiSwitch-switchBase.Mui-checked": { color: "#7786f8" },
          "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: "#7786f8" },
        },
        track: { backgroundColor: "rgba(255,255,255,0.2)" },
      },
    },
    MuiFormControlLabel: {
      styleOverrides: { label: { fontSize: 13, color: "#c9c9cf" } },
    },
    MuiCheckbox: {
      styleOverrides: { root: { color: "rgba(255,255,255,0.4)", "&.Mui-checked": { color: "#7786f8" } } },
    },
    MuiRadio: {
      styleOverrides: { root: { color: "rgba(255,255,255,0.4)", "&.Mui-checked": { color: "#7786f8" } } },
    },
    MuiTablePagination: {
      styleOverrides: {
        root: { color: "#94949c", fontSize: 12 },
      },
    },
  },
});
