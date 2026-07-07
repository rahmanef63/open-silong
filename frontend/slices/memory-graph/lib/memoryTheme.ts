/** Design tokens for the "Memory" graph surface. These are INTENTIONAL fixed
 *  brand colours for this one distinctive view (a dark canvas + lime accent,
 *  à la a memory/knowledge-graph product) — NOT the global theme tokens. The
 *  rest of the app stays theme-token driven; this surface is deliberately dark.
 */
export const MEM = {
  accent: "#d4f84a", // lime / chartreuse
  accentInk: "#15160f", // dark text/icon on the accent
  surface: "#0b0b0d", // near-black canvas
  dot: "rgba(255,255,255,0.05)", // background grid dots
  hubCore: "#f4ffcf", // hot centre of the hub glow
  chip: "rgba(255,255,255,0.06)", // category chip fill
  chipBorder: "rgba(255,255,255,0.10)",
  pill: "rgba(255,255,255,0.045)", // leaf pill fill
  edge: "rgba(255,255,255,0.10)",
  edgeHot: "rgba(212,248,74,0.85)", // highlighted edge
  text: "rgba(255,255,255,0.92)",
  muted: "rgba(255,255,255,0.45)",
} as const;
