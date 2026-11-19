"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { CssBaseline, IconButton, ThemeProvider, Tooltip } from "@mui/material";
import { Moon, Sun } from "lucide-react";
import { createAppTheme, type ColorMode } from "@/theme";

const STORAGE_KEY = "gymflow-color-mode";

interface ColorModeContextValue {
  mode: ColorMode;
  setMode: (mode: ColorMode) => void;
  toggle: () => void;
}

const ColorModeContext = createContext<ColorModeContextValue | null>(null);

export function ColorModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ColorMode>("dark");

  // Read the stored preference after mount so server and client markup match.
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") setModeState(stored);
  }, []);

  const setMode = useCallback((next: ColorMode) => {
    setModeState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const toggle = useCallback(() => {
    setModeState((current) => {
      const next: ColorMode = current === "dark" ? "light" : "dark";
      window.localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const theme = useMemo(() => createAppTheme(mode), [mode]);
  const value = useMemo(() => ({ mode, setMode, toggle }), [mode, setMode, toggle]);

  return (
    <ColorModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

export function useColorMode() {
  const context = useContext(ColorModeContext);
  if (!context) throw new Error("useColorMode must be used inside ColorModeProvider");
  return context;
}

/** Sun/moon switch used in the app header and on the auth screens. */
export function ColorModeToggle({ size = 18 }: { size?: number }) {
  const { mode, toggle } = useColorMode();
  const next = mode === "dark" ? "Light mode" : "Dark mode";
  return (
    <Tooltip title={next}>
      <IconButton aria-label={next} onClick={toggle}>
        {mode === "dark" ? <Sun size={size} strokeWidth={1.9} /> : <Moon size={size} strokeWidth={1.9} />}
      </IconButton>
    </Tooltip>
  );
}
