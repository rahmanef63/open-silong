/**
 * Tweakcn theme preset loader for Nosion — barrel.
 * Implementation lives in ./tweakcn/. Public API preserved verbatim:
 *   applyTweakcnPreset / previewTweakcnPreset / restoreTweakcnPreset
 *   getSavedTweakcnPreset / clearTweakcnPreset / bootTweakcnPreset
 *   loadTweakcnRegistry / findTweakcnPreset / tweakcnSwatches
 *   groupTweakcnPresets / TWEAKCN_PRESET_GROUPS
 *
 * Architecture notes (Nosion-specific):
 *   - Tailwind 4 `@theme inline` maps `--color-X: hsl(var(--X))`. We KEEP
 *     the registry's `oklch(...)` wrapper intact and override `--color-*`
 *     directly so utility classes (`bg-primary`, etc.) follow the preset.
 *   - Brand-bridge mirrors `primary` to `--brand*` so `bg-brand` utilities
 *     follow the preset.
 *   - Direct `hsl(var(--primary))` consumers (a few inline-style SVG fills
 *     in MapView and admin charts) keep showing the BASE palette —
 *     acceptable trade-off; they are ornament-only.
 */

export type {
  TweakcnPresetItem, TweakcnRegistry, TweakcnPresetMeta, TweakcnPresetGroup,
} from "./tweakcn/types";

export {
  loadTweakcnRegistry, findTweakcnPreset, tweakcnSwatches,
} from "./tweakcn/registry";

export {
  applyTweakcnPreset, previewTweakcnPreset, restoreTweakcnPreset,
  getSavedTweakcnPreset, clearTweakcnPreset, bootTweakcnPreset,
} from "./tweakcn/apply";

export { TWEAKCN_PRESET_GROUPS, groupTweakcnPresets } from "./tweakcn/groups";
