/**
 * GymFlow accent palette.
 *
 * Six muted hues derived from one seed (indigo, the CRM accent) at a shared
 * low saturation and lightness, so every tone carries the same visual weight on
 * the near-black ground without turning neon. Each tone ships a `main` for text, strokes and bars, and a
 * `soft` wash for icon chips and card glows.
 */
export const TONES = {
  indigo: { main: "#8492cd", soft: "rgba(132, 146, 205, 0.15)", glow: "rgba(132, 146, 205, 0.22)" },
  violet: { main: "#af93c8", soft: "rgba(175, 147, 200, 0.15)", glow: "rgba(175, 147, 200, 0.22)" },
  cyan: { main: "#72abb6", soft: "rgba(114, 171, 182, 0.14)", glow: "rgba(114, 171, 182, 0.2)" },
  emerald: { main: "#74b499", soft: "rgba(116, 180, 153, 0.14)", glow: "rgba(116, 180, 153, 0.2)" },
  amber: { main: "#cdae7a", soft: "rgba(205, 174, 122, 0.14)", glow: "rgba(205, 174, 122, 0.2)" },
  rose: { main: "#cc8e9b", soft: "rgba(204, 142, 155, 0.14)", glow: "rgba(204, 142, 155, 0.2)" },
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
  "#aeb8e0",
  "#9acbb7",
  "#dfc89f",
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
  axis: { fontSize: 11, fill: "#8d8d95" },
  grid: "rgba(255,255,255,0.07)",
  cursor: { fill: "rgba(255,255,255,0.05)" },
  tooltip: {
    backgroundColor: "#151519",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 10,
    fontSize: 12,
    color: "#f5f5f6",
  },
};

/** Rotate a tone by index so repeated cards stay varied but ordered. */
export const toneAt = (index: number): ToneName => {
  const order: ToneName[] = ["indigo", "cyan", "amber", "violet", "emerald", "rose"];
  return order[index % order.length];
};
