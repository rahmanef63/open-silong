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

export const ROOT_VAR_KEYS: Array<keyof ThemePalette> = [
  "background", "foreground", "surface", "card", "popover",
  "muted", "muted-foreground", "accent", "accent-foreground",
  "secondary", "border", "border-strong",
  "brand", "brand-foreground", "brand-soft", "ring",
  "sidebar-background", "sidebar-foreground", "sidebar-accent", "sidebar-border",
  "block-hover",
];
