export const COLOR_HEX: Record<string, string> = {
  gray: "#6b7280",
  brown: "#a16207",
  orange: "#f97316",
  yellow: "#eab308",
  green: "#10b981",
  blue: "#3b82f6",
  purple: "#a855f7",
  pink: "#ec4899",
  red: "#ef4444",
};

export const VW = 720;
export const VH = 360;

export function project(lat: number, lng: number): { x: number; y: number } {
  const cLat = Math.max(-85, Math.min(85, lat));
  const cLng = Math.max(-180, Math.min(180, lng));
  return {
    x: ((cLng + 180) / 360) * VW,
    y: ((90 - cLat) / 180) * VH,
  };
}

/** Rough continent outlines (equirectangular) — decorative, not geographically precise. */
export const CONTINENTS = [
  // North America
  "M 100 80 L 170 70 L 210 95 L 230 130 L 200 165 L 160 175 L 140 155 L 120 130 Z",
  // South America
  "M 200 200 L 245 195 L 260 230 L 250 280 L 220 300 L 205 270 Z",
  // Europe
  "M 350 90 L 410 85 L 425 110 L 405 130 L 365 125 L 350 105 Z",
  // Africa
  "M 360 145 L 425 140 L 445 195 L 420 250 L 380 240 L 360 195 Z",
  // Asia
  "M 430 80 L 580 75 L 620 110 L 615 165 L 555 175 L 480 160 L 440 130 Z",
  // Oceania
  "M 555 230 L 620 225 L 640 255 L 605 270 L 570 260 Z",
  // Greenland
  "M 290 50 L 320 45 L 335 75 L 310 90 L 285 75 Z",
];
