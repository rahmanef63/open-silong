export { ThemePicker } from "./components/ThemePicker";
export { useThemePreset } from "./useThemePreset";
export { THEME_PRESETS, getPreset, applyPresetVars, clearPresetVars } from "./presets";
export type { ThemePreset, ThemePalette } from "./presets";

// Tweakcn registry-based preset system (additive — does not replace
// the simple THEME_PRESETS above). Loads ~36 presets from
// /r/registry.json. localStorage key: `nosion:theme-preset`.
export { TweakcnSwitcher } from "./components/TweakcnSwitcher";
export { ThemeColorSync } from "./components/ThemeColorSync";
export { WorkspaceThemePicker } from "./components/WorkspaceThemePicker";
export { WorkspaceThemeBridge } from "./components/WorkspaceThemeBridge";
export {
  applyTweakcnPreset,
  bootTweakcnPreset,
  clearTweakcnPreset,
  findTweakcnPreset,
  getSavedTweakcnPreset,
  groupTweakcnPresets,
  loadTweakcnRegistry,
  previewTweakcnPreset,
  restoreTweakcnPreset,
  tweakcnSwatches,
  TWEAKCN_PRESET_GROUPS,
} from "./lib/tweakcn";
export type {
  TweakcnPresetGroup,
  TweakcnPresetItem,
  TweakcnPresetMeta,
  TweakcnRegistry,
} from "./lib/tweakcn";
