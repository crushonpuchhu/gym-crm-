/**
 * GymFlow accent palette.
 *
 * Sampled from the dark-navy dashboard reference: deep blue ground, electric
 * blue for primary action, violet for secondary series, then amber, green,
 * pink and sky as category accents. Saturation is held back slightly so the
 * tones stay readable on the near-black navy rather than glowing.
 */
export const TONES = {
  indigo: { main: "#5b8cf5", soft: "rgba(91, 140, 245, 0.16)", glow: "rgba(91, 140, 245, 0.24)" },
  violet: { main: "#8b6ce8", soft: "rgba(139, 108, 232, 0.16)", glow: "rgba(139, 108, 232, 0.22)" },
  cyan: { main: "#74aee8", soft: "rgba(116, 174, 232, 0.15)", glow: "rgba(116, 174, 232, 0.2)" },
  emerald: { main: "#56bd77", soft: "rgba(86, 189, 119, 0.15)", glow: "rgba(86, 189, 119, 0.2)" },
  amber: { main: "#eda23c", soft: "rgba(237, 162, 60, 0.15)", glow: "rgba(237, 162, 60, 0.2)" },
  rose: { main: "#e06d92", soft: "rgba(224, 109, 146, 0.15)", glow: "rgba(224, 109, 146, 0.2)" },
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
  "#a9c2ff",
  "#8fd9a8",
  "#f6c98b",
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
  axis: { fontSize: 11, fill: "#8c99b4" },
  grid: "rgba(140, 165, 220, 0.12)",
  cursor: { fill: "rgba(91, 140, 245, 0.08)" },
  tooltip: {
    backgroundColor: "#101a2e",
    border: "1px solid rgba(140, 165, 220, 0.22)",
    borderRadius: 10,
    fontSize: 12,
    color: "#eef2fb",
  },
};

/** Rotate a tone by index so repeated cards stay varied but ordered. */
export const toneAt = (index: number): ToneName => {
  const order: ToneName[] = ["indigo", "cyan", "amber", "violet", "emerald", "rose"];
  return order[index % order.length];
};
