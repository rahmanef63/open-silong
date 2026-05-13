import type { ThemePalette } from "./types";

/* Most variables stay neutral; we only tint brand, ring, sidebar-accent,
 * and surface a touch toward the brand hue. */
export const defaultLight: ThemePalette = {
  background: "0 0% 100%",
  foreground: "220 13% 13%",
  surface: "30 14% 98%",
  card: "0 0% 100%",
  popover: "0 0% 100%",
  muted: "30 10% 96%",
  "muted-foreground": "220 9% 46%",
  accent: "30 14% 94%",
  "accent-foreground": "220 13% 13%",
  secondary: "30 10% 96%",
  border: "30 8% 90%",
  "border-strong": "30 6% 82%",
  brand: "24 90% 56%",
  "brand-foreground": "0 0% 100%",
  "brand-soft": "28 100% 96%",
  ring: "24 90% 56%",
  "sidebar-background": "30 14% 97%",
  "sidebar-foreground": "220 10% 30%",
  "sidebar-accent": "30 14% 92%",
  "sidebar-border": "30 8% 88%",
  "block-hover": "30 14% 96%",
};

export const defaultDark: ThemePalette = {
  background: "220 14% 10%",
  foreground: "30 10% 92%",
  surface: "220 14% 12%",
  card: "220 14% 12%",
  popover: "220 14% 14%",
  muted: "220 14% 16%",
  "muted-foreground": "220 9% 62%",
  accent: "220 14% 18%",
  "accent-foreground": "30 10% 92%",
  secondary: "220 14% 16%",
  border: "220 10% 22%",
  "border-strong": "220 10% 28%",
  brand: "24 90% 60%",
  "brand-foreground": "220 14% 10%",
  "brand-soft": "24 40% 18%",
  ring: "24 90% 60%",
  "sidebar-background": "220 14% 11%",
  "sidebar-foreground": "30 8% 78%",
  "sidebar-accent": "220 14% 16%",
  "sidebar-border": "220 10% 20%",
  "block-hover": "220 14% 15%",
};

/** Build a preset by recolouring brand-adjacent variables on top of the
 *  default neutral palette. Keeps cognitive load low — picking a preset
 *  always means "swap the accent hue", surfaces stay readable. */
export function brandedLight(
  brandHue: number, brandSat = 80, brandLight = 56,
  surfaceHue = brandHue, surfaceSat = 14,
): ThemePalette {
  return {
    ...defaultLight,
    surface: `${surfaceHue} ${surfaceSat}% 98%`,
    accent: `${surfaceHue} ${surfaceSat}% 94%`,
    secondary: `${surfaceHue} ${Math.max(0, surfaceSat - 4)}% 96%`,
    muted: `${surfaceHue} ${Math.max(0, surfaceSat - 4)}% 96%`,
    border: `${surfaceHue} 8% 90%`,
    "border-strong": `${surfaceHue} 6% 82%`,
    brand: `${brandHue} ${brandSat}% ${brandLight}%`,
    "brand-soft": `${brandHue} 100% 96%`,
    ring: `${brandHue} ${brandSat}% ${brandLight}%`,
    "sidebar-background": `${surfaceHue} ${surfaceSat}% 97%`,
    "sidebar-accent": `${surfaceHue} ${surfaceSat}% 92%`,
    "sidebar-border": `${surfaceHue} 8% 88%`,
    "block-hover": `${surfaceHue} ${surfaceSat}% 96%`,
  };
}

export function brandedDark(
  brandHue: number, brandSat = 80, brandLight = 60,
  surfaceHue = 220, surfaceSat = 14,
): ThemePalette {
  return {
    ...defaultDark,
    surface: `${surfaceHue} ${surfaceSat}% 12%`,
    accent: `${surfaceHue} ${surfaceSat}% 18%`,
    secondary: `${surfaceHue} ${surfaceSat}% 16%`,
    muted: `${surfaceHue} ${surfaceSat}% 16%`,
    border: `${surfaceHue} 10% 22%`,
    "border-strong": `${surfaceHue} 10% 28%`,
    brand: `${brandHue} ${brandSat}% ${brandLight}%`,
    "brand-soft": `${brandHue} 40% 18%`,
    ring: `${brandHue} ${brandSat}% ${brandLight}%`,
    "sidebar-background": `${surfaceHue} ${surfaceSat}% 11%`,
    "sidebar-accent": `${surfaceHue} ${surfaceSat}% 16%`,
    "sidebar-border": `${surfaceHue} 10% 20%`,
    "block-hover": `${surfaceHue} ${surfaceSat}% 15%`,
  };
}
