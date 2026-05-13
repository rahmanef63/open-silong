import type { ThemePreset } from "./types";
import { ROOT_VAR_KEYS } from "./types";
import { THEME_PRESETS } from "./list";

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
