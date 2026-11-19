import { createTheme } from "@mui/material/styles";

/**
 * GymFlow app theme — deep navy ground with an electric-blue accent set.
 *
 * Sampled from the dark-navy dashboard reference: near-black blue grounds,
 * cool grey-blue text, and one strong blue for primary action. Violet, sky,
 * green, amber and pink carry data and status. The marketing landing page
 * keeps its own paper palette.
 */
export const theme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: "#04060f",
      paper: "#0a101d",
    },
    divider: "rgba(140, 165, 220, 0.14)",
    text: {
      primary: "#eef2fb",
      secondary: "#909db6",
      disabled: "#566076",
    },
    primary: {
      main: "#4b7cf2",
      light: "#74aee8",
      dark: "#3e71ec",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#8b6ce8",
      contrastText: "#ffffff",
    },
    success: { main: "#56bd77" },
    warning: { main: "#eda23c" },
    error: { main: "#e06d92" },
    info: { main: "#74aee8" },
    action: {
      hover: "rgba(140, 165, 220, 0.08)",
      selected: "rgba(75, 124, 242, 0.16)",
      disabled: "rgba(140, 165, 220, 0.3)",
      disabledBackground: "rgba(140, 165, 220, 0.07)",
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
          backgroundColor: "#04060f",
          backgroundImage:
            "radial-gradient(1100px 640px at 8% -14%, rgba(75,124,242,0.18), transparent 62%), radial-gradient(880px 520px at 92% -6%, rgba(139,108,232,0.14), transparent 58%), radial-gradient(760px 520px at 60% 108%, rgba(16,62,160,0.16), transparent 62%)",
          backgroundAttachment: "fixed",
          "& ::selection": { backgroundColor: "rgba(75,124,242,0.4)" },
        },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundColor: "#0a101d",
          backgroundImage: "none",
          border: "1px solid rgba(140, 165, 220, 0.14)",
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 10, paddingInline: 16, minHeight: 36 },
        sizeSmall: { minHeight: 30, paddingInline: 12, fontSize: 12 },
        contained: {
          backgroundColor: "#3f6fe0",
          color: "#ffffff",
          "&:hover": { backgroundColor: "#3a67d6" },
        },
        outlined: {
          borderColor: "rgba(140,165,220,0.24)",
          color: "#eef2fb",
          "&:hover": {
            borderColor: "rgba(75,124,242,0.6)",
            backgroundColor: "rgba(75,124,242,0.12)",
            color: "#cfdcff",
          },
        },
        text: {
          color: "#eef2fb",
          "&:hover": { backgroundColor: "rgba(75,124,242,0.12)", color: "#cfdcff" },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          color: "#909db6",
          "&:hover": { backgroundColor: "rgba(75,124,242,0.16)", color: "#abc5f3" },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: "rgba(140,165,220,0.12)", padding: "13px 16px" },
        head: {
          fontSize: 10.5,
          fontWeight: 600,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "#909db6",
          backgroundColor: "transparent",
          borderBottom: "1px solid rgba(140,165,220,0.16)",
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          "&:last-child td": { borderBottom: "none" },
          "&:hover": { backgroundColor: "rgba(75,124,242,0.06)" },
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
          backgroundColor: "rgba(140,165,220,0.12)",
          color: "#dbe4f7",
          border: "1px solid rgba(140,165,220,0.14)",
        },
        outlined: { backgroundColor: "transparent" },
        label: { paddingInline: 10 },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: "#0c1424",
          borderRadius: 10,
          fontSize: 13.5,
          "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(140,165,220,0.18)" },
          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(140,165,220,0.32)" },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(75,124,242,0.8)",
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
        root: { fontSize: 13, color: "#909db6" },
      },
    },
    MuiFormLabel: {
      styleOverrides: {
        root: { fontSize: 12.5, color: "#909db6", "&.Mui-focused": { color: "#abc5f3" } },
      },
    },
    MuiSelect: {
      styleOverrides: { select: { paddingTop: 9, paddingBottom: 9 } },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          backgroundColor: "#101a2e",
          border: "1px solid rgba(140,165,220,0.18)",
          borderRadius: 12,
          marginTop: 6,
          backgroundImage: "none",
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
            backgroundColor: "rgba(75,124,242,0.2)",
            "&:hover": { backgroundColor: "rgba(75,124,242,0.26)" },
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: "#0b1220",
          borderRadius: 20,
          border: "1px solid rgba(140,165,220,0.16)",
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
          backgroundColor: "#101a2e",
          color: "#eef2fb",
          fontSize: 11.5,
          fontWeight: 600,
          borderRadius: 8,
          border: "1px solid rgba(140,165,220,0.2)",
        },
        arrow: { color: "#101a2e" },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          minHeight: 42,
          color: "#909db6",
          "&.Mui-selected": {
            backgroundColor: "rgba(75,124,242,0.16)",
            color: "#e4ecff",
            "& .MuiListItemIcon-root": { color: "#74aee8" },
            "&:hover": { backgroundColor: "rgba(75,124,242,0.22)" },
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
          backgroundColor: "#050912",
          border: "none",
          borderRight: "1px solid rgba(140,165,220,0.12)",
          backgroundImage: "none",
        },
      },
    },
    MuiToggleButtonGroup: {
      styleOverrides: {
        root: {
          backgroundColor: "#0c1424",
          border: "1px solid rgba(140,165,220,0.14)",
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
          color: "#909db6",
          paddingInline: 12,
          paddingBlock: 4,
          "&.Mui-selected": {
            backgroundColor: "#3f6fe0",
            color: "#ffffff",
            "&:hover": { backgroundColor: "#3a67d6" },
          },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { backgroundColor: "rgba(140,165,220,0.1)", borderRadius: 999, height: 6 },
        bar: {
          backgroundImage: "linear-gradient(90deg, #4b7cf2 0%, #8b6ce8 100%)",
          borderRadius: 999,
        },
      },
    },
    MuiSkeleton: {
      styleOverrides: {
        root: { backgroundColor: "rgba(140,165,220,0.1)" },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          fontSize: 13,
          border: "1px solid rgba(140,165,220,0.16)",
          "&.MuiAlert-standardError, &.MuiAlert-standardSuccess, &.MuiAlert-standardInfo, &.MuiAlert-standardWarning": {
            backgroundColor: "rgba(140,165,220,0.08)",
            color: "#eef2fb",
          },
        },
      },
    },
    MuiDivider: { styleOverrides: { root: { borderColor: "rgba(140,165,220,0.12)" } } },
    MuiAvatar: {
      styleOverrides: {
        root: {
          backgroundImage: "linear-gradient(135deg, #2f5fd0 0%, #5f29ea 100%)",
          color: "#ffffff",
          fontWeight: 600,
        },
      },
    },
    MuiTabs: { styleOverrides: { indicator: { backgroundColor: "#4b7cf2", height: 2 } } },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontSize: 13,
          fontWeight: 600,
          color: "#909db6",
          "&.Mui-selected": { color: "#abc5f3" },
        },
      },
    },
    MuiBadge: {
      styleOverrides: { badge: { backgroundColor: "#4b7cf2", color: "#ffffff", fontWeight: 700 } },
    },
    MuiSwitch: {
      styleOverrides: {
        root: {
          "& .MuiSwitch-switchBase.Mui-checked": { color: "#4b7cf2" },
          "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: "#4b7cf2" },
        },
        track: { backgroundColor: "rgba(140,165,220,0.24)" },
      },
    },
    MuiFormControlLabel: {
      styleOverrides: { label: { fontSize: 13, color: "#c6d0e6" } },
    },
    MuiCheckbox: {
      styleOverrides: { root: { color: "rgba(140,165,220,0.45)", "&.Mui-checked": { color: "#4b7cf2" } } },
    },
    MuiRadio: {
      styleOverrides: { root: { color: "rgba(140,165,220,0.45)", "&.Mui-checked": { color: "#4b7cf2" } } },
    },
    MuiTablePagination: {
      styleOverrides: {
        root: { color: "#909db6", fontSize: 12 },
      },
    },
  },
});
