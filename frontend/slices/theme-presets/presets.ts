/* Theme preset registry. Each preset overrides a core set of CSS variables
 * defined in src/app/index.css :root / .dark. Variables are HSL triples
 * "H S% L%" — set via document.documentElement.style.setProperty. */

export interface ThemePalette {
  /* Core */
  background: string;
  foreground: string;
  surface: string;
  card: string;
  popover: string;

  /* Neutrals */
  muted: string;
  "muted-foreground": string;
  accent: string;
  "accent-foreground": string;
  secondary: string;
  border: string;
  "border-strong": string;

  /* Brand */
  brand: string;
  "brand-foreground": string;
  "brand-soft": string;
  ring: string;

  /* Sidebar */
  "sidebar-background": string;
  "sidebar-foreground": string;
  "sidebar-accent": string;
  "sidebar-border": string;

  /* Block */
  "block-hover": string;
}

export interface ThemePreset {
  id: string;
  name: string;
  emoji: string;
  /** Hex used for the swatch tile in the picker. */
  swatch: { brand: string; bg: string; fg: string };
  light: ThemePalette;
  dark: ThemePalette;
}

/* Convenience — most variables stay neutral; we only really tint brand,
 * ring, sidebar-accent, and surface a touch toward the brand hue. */
const defaultLight: ThemePalette = {
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
const defaultDark: ThemePalette = {
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
function brandedLight(brandHue: number, brandSat = 80, brandLight = 56, surfaceHue = brandHue, surfaceSat = 14): ThemePalette {
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

function brandedDark(brandHue: number, brandSat = 80, brandLight = 60, surfaceHue = 220, surfaceSat = 14): ThemePalette {
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

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "default",
    name: "Sunrise",
    emoji: "🟧",
    swatch: { brand: "#f08a40", bg: "#ffffff", fg: "#1d2128" },
    light: defaultLight,
    dark: defaultDark,
  },
  {
    id: "slate",
    name: "Slate",
    emoji: "⬜",
    swatch: { brand: "#3478f6", bg: "#fafbfc", fg: "#1a1d24" },
    light: brandedLight(216, 90, 52, 220, 8),
    dark: brandedDark(216, 80, 64, 220, 12),
  },
  {
    id: "ocean",
    name: "Ocean",
    emoji: "🌊",
    swatch: { brand: "#1aa5b8", bg: "#f4fafb", fg: "#0f2228" },
    light: brandedLight(188, 70, 42, 195, 18),
    dark: brandedDark(188, 70, 56, 200, 14),
  },
  {
    id: "forest",
    name: "Forest",
    emoji: "🌲",
    swatch: { brand: "#2f9e60", bg: "#f6faf7", fg: "#102216" },
    light: brandedLight(146, 60, 38, 140, 14),
    dark: brandedDark(146, 60, 50, 150, 14),
  },
  {
    id: "rose",
    name: "Rose",
    emoji: "🌸",
    swatch: { brand: "#e2538d", bg: "#fff7fa", fg: "#241218" },
    light: brandedLight(338, 75, 56, 340, 18),
    dark: brandedDark(338, 70, 64, 340, 14),
  },
  {
    id: "violet",
    name: "Violet",
    emoji: "🟣",
    swatch: { brand: "#8b5cf6", bg: "#fbf9ff", fg: "#1d1729" },
    light: brandedLight(258, 80, 62, 260, 18),
    dark: brandedDark(258, 75, 68, 260, 14),
  },
  {
    id: "sunset",
    name: "Sunset",
    emoji: "🌅",
    swatch: { brand: "#ff5b8c", bg: "#fff8f4", fg: "#241419" },
    light: brandedLight(346, 95, 60, 18, 24),
    dark: brandedDark(346, 90, 66, 18, 14),
  },
  {
    id: "mono",
    name: "Mono",
    emoji: "⚫",
    swatch: { brand: "#1a1a1a", bg: "#ffffff", fg: "#0a0a0a" },
    light: { ...defaultLight, brand: "0 0% 9%", "brand-foreground": "0 0% 100%", "brand-soft": "0 0% 95%", ring: "0 0% 9%", surface: "0 0% 99%", accent: "0 0% 94%", muted: "0 0% 96%", border: "0 0% 90%", "border-strong": "0 0% 82%", "sidebar-background": "0 0% 98%", "sidebar-accent": "0 0% 93%", "sidebar-border": "0 0% 90%", "block-hover": "0 0% 96%" },
    dark: { ...defaultDark, brand: "0 0% 90%", "brand-foreground": "0 0% 9%", "brand-soft": "0 0% 22%", ring: "0 0% 90%" },
  },
];

const ROOT_VAR_KEYS: Array<keyof ThemePalette> = [
  "background", "foreground", "surface", "card", "popover",
  "muted", "muted-foreground", "accent", "accent-foreground",
  "secondary", "border", "border-strong",
  "brand", "brand-foreground", "brand-soft", "ring",
  "sidebar-background", "sidebar-foreground", "sidebar-accent", "sidebar-border",
  "block-hover",
];

export function getPreset(id: string): ThemePreset {
  return THEME_PRESETS.find((p) => p.id === id) ?? THEME_PRESETS[0];
}

export function applyPresetVars(preset: ThemePreset, isDark: boolean) {
  const palette = isDark ? preset.dark : preset.light;
  const root = document.documentElement;
  for (const key of ROOT_VAR_KEYS) {
    const v = palette[key];
    if (v != null) root.style.setProperty(`--${key}`, v);
  }
}

export function clearPresetVars() {
  const root = document.documentElement;
  for (const key of ROOT_VAR_KEYS) root.style.removeProperty(`--${key}`);
}
