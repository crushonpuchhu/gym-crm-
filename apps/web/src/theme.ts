import { createTheme } from "@mui/material/styles";

/**
 * GymFlow app theme — monochrome dark surface.
 *
 * One neutral scale only: near-black grounds, white text, hairline dividers.
 * Emphasis comes from contrast and weight, never hue, so status colours stay
 * greyscale and the marketing landing page keeps its own palette.
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
      main: "#f5f5f6",
      contrastText: "#0a0a0b",
    },
    secondary: {
      main: "#2a2a30",
      contrastText: "#f5f5f6",
    },
    success: { main: "#e4e4e7" },
    warning: { main: "#b9b9c0" },
    error: { main: "#8d8d95" },
    info: { main: "#d4d4d8" },
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
            "radial-gradient(1100px 620px at 12% -12%, rgba(255,255,255,0.07), transparent 62%), radial-gradient(900px 520px at 96% 0%, rgba(255,255,255,0.04), transparent 58%)",
          backgroundAttachment: "fixed",
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
          backgroundColor: "#f5f5f6",
          color: "#0a0a0b",
          "&:hover": { backgroundColor: "#ffffff" },
        },
        outlined: {
          borderColor: "rgba(255,255,255,0.16)",
          color: "#f5f5f6",
          "&:hover": { borderColor: "rgba(255,255,255,0.36)", backgroundColor: "rgba(255,255,255,0.05)" },
        },
        text: { color: "#f5f5f6", "&:hover": { backgroundColor: "rgba(255,255,255,0.06)" } },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          color: "#b9b9c0",
          "&:hover": { backgroundColor: "rgba(255,255,255,0.07)", color: "#f5f5f6" },
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
          "&:hover": { backgroundColor: "rgba(255,255,255,0.025)" },
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
            borderColor: "rgba(255,255,255,0.6)",
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
        root: { fontSize: 12.5, color: "#94949c", "&.Mui-focused": { color: "#f5f5f6" } },
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
            backgroundColor: "rgba(255,255,255,0.09)",
            color: "#f5f5f6",
            "&:hover": { backgroundColor: "rgba(255,255,255,0.12)" },
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
            backgroundColor: "#f5f5f6",
            color: "#0a0a0b",
            "&:hover": { backgroundColor: "#ffffff" },
          },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 999, height: 6 },
        bar: { backgroundColor: "#f5f5f6", borderRadius: 999 },
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
    MuiAvatar: { styleOverrides: { root: { backgroundColor: "#26262c", color: "#f5f5f6", fontWeight: 600 } } },
    MuiTabs: { styleOverrides: { indicator: { backgroundColor: "#f5f5f6", height: 2 } } },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontSize: 13,
          fontWeight: 600,
          color: "#8d8d95",
          "&.Mui-selected": { color: "#f5f5f6" },
        },
      },
    },
    MuiBadge: {
      styleOverrides: { badge: { backgroundColor: "#f5f5f6", color: "#0a0a0b", fontWeight: 700 } },
    },
    MuiSwitch: {
      styleOverrides: {
        root: { "& .MuiSwitch-switchBase.Mui-checked": { color: "#f5f5f6" } },
        track: { backgroundColor: "rgba(255,255,255,0.2)" },
      },
    },
    MuiFormControlLabel: {
      styleOverrides: { label: { fontSize: 13, color: "#c9c9cf" } },
    },
    MuiCheckbox: { styleOverrides: { root: { color: "rgba(255,255,255,0.4)" } } },
    MuiRadio: { styleOverrides: { root: { color: "rgba(255,255,255,0.4)" } } },
    MuiTablePagination: {
      styleOverrides: {
        root: { color: "#94949c", fontSize: 12 },
      },
    },
  },
});
