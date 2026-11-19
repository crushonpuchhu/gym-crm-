/**
 * GymFlow accent palette.
 *
 * Tones are CSS custom properties set by the theme, so the same six roles
 * resolve to navy-bright values in dark mode and deeper ink values in light
 * mode. Each role ships a `main` for text, strokes and bars, plus a low-alpha
 * `soft` wash for chips and a `glow` for card corners.
 */
export const TONES = {
  indigo: {
    main: "var(--gf-tone-indigo)",
    soft: "var(--gf-tone-indigo-soft)",
    glow: "var(--gf-tone-indigo-glow)",
    chip: "var(--gf-chip-indigo)",
    chipText: "var(--gf-chip-solid-text)",
  },
  violet: {
    main: "var(--gf-tone-violet)",
    soft: "var(--gf-tone-violet-soft)",
    glow: "var(--gf-tone-violet-glow)",
    chip: "var(--gf-chip-violet)",
    chipText: "var(--gf-chip-solid-text)",
  },
  cyan: {
    main: "var(--gf-tone-cyan)",
    soft: "var(--gf-tone-cyan-soft)",
    glow: "var(--gf-tone-cyan-glow)",
    chip: "var(--gf-chip-cyan)",
    chipText: "var(--gf-chip-solid-text)",
  },
  emerald: {
    main: "var(--gf-tone-emerald)",
    soft: "var(--gf-tone-emerald-soft)",
    glow: "var(--gf-tone-emerald-glow)",
    chip: "var(--gf-chip-emerald)",
    chipText: "var(--gf-chip-solid-text)",
  },
  amber: {
    main: "var(--gf-tone-amber)",
    soft: "var(--gf-tone-amber-soft)",
    glow: "var(--gf-tone-amber-glow)",
    chip: "var(--gf-chip-amber)",
    chipText: "var(--gf-chip-solid-text)",
  },
  rose: {
    main: "var(--gf-tone-rose)",
    soft: "var(--gf-tone-rose-soft)",
    glow: "var(--gf-tone-rose-glow)",
    chip: "var(--gf-chip-rose)",
    chipText: "var(--gf-chip-solid-text)",
  },
} as const;

export type ToneName = keyof typeof TONES;

export const tone = (name: ToneName) => TONES[name];

/** Ordered series for multi-category charts (bars, pies, stacked groups). */
export const SERIES: string[] = [
  TONES.indigo.main,
  TONES.cyan.main,
  TONES.amber.main,
  TONES.violet.main,
  TONES.emerald.main,
  TONES.rose.main,
];

/** Nine-step expansion for pies and legends with more categories than hues. */
export const SERIES_9: string[] = [
  ...SERIES,
  "var(--gf-series-7)",
  "var(--gf-series-8)",
  "var(--gf-series-9)",
];

/** Same order, low-alpha fills for stacked or area work. */
export const SERIES_SOFT: string[] = [
  TONES.indigo.soft,
  TONES.cyan.soft,
  TONES.amber.soft,
  TONES.violet.soft,
  TONES.emerald.soft,
  TONES.rose.soft,
];

/** Recharts furniture shared by every chart in the app. */
export const CHART = {
  axis: { fontSize: 11, fill: "var(--gf-chart-axis)" },
  grid: "var(--gf-chart-grid)",
  cursor: { fill: "var(--gf-chart-cursor)" },
  tooltip: {
    backgroundColor: "var(--gf-chart-tooltip-bg)",
    border: "1px solid var(--gf-chart-tooltip-border)",
    borderRadius: 10,
    fontSize: 12,
    color: "var(--gf-chart-tooltip-text)",
  },
};

/** Rotate a tone by index so repeated cards stay varied but ordered. */
export const toneAt = (index: number): ToneName => {
  const order: ToneName[] = ["indigo", "cyan", "amber", "violet", "emerald", "rose"];
  return order[index % order.length];
};
