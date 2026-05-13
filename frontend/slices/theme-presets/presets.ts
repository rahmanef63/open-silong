/* Theme preset registry — barrel.
 *
 * Each preset overrides a core set of CSS variables defined in
 * `app/globals.css` :root / .dark. Variables are HSL triples "H S% L%"
 * applied via document.documentElement.style.setProperty. */

export type { ThemePalette, ThemePreset } from "./presets/types";
export { THEME_PRESETS } from "./presets/list";
export { getPreset, applyPresetVars, clearPresetVars } from "./presets/apply";
