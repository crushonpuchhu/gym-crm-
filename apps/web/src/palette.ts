/**
 * GymFlow accent palette.
 *
 * Six hues derived from one seed (indigo, the CRM accent) at a shared
 * saturation/lightness so every tone carries the same visual weight on the
 * near-black ground. Each tone ships a `main` for text, strokes and bars, and a
 * `soft` wash for icon chips and card glows.
 */
export const TONES = {
  indigo: { main: "#7786f8", soft: "rgba(119, 134, 248, 0.15)", glow: "rgba(119, 134, 248, 0.22)" },
  violet: { main: "#b584f5", soft: "rgba(181, 132, 245, 0.15)", glow: "rgba(181, 132, 245, 0.22)" },
  cyan: { main: "#53d3ea", soft: "rgba(83, 211, 234, 0.14)", glow: "rgba(83, 211, 234, 0.2)" },
  emerald: { main: "#45d39f", soft: "rgba(69, 211, 159, 0.14)", glow: "rgba(69, 211, 159, 0.2)" },
  amber: { main: "#f7c04a", soft: "rgba(247, 192, 74, 0.14)", glow: "rgba(247, 192, 74, 0.2)" },
  rose: { main: "#f06a93", soft: "rgba(240, 106, 147, 0.14)", glow: "rgba(240, 106, 147, 0.2)" },
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
  "#c9d2ff",
  "#a4e9c9",
  "#ffd7a1",
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
