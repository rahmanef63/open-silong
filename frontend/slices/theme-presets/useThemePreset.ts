import { useCallback, useEffect, useState } from "react";
import { applyPresetVars, getPreset, THEME_PRESETS } from "./presets";

const KEY = "notion-clone:theme-preset";

const readId = (): string => {
  try { return localStorage.getItem(KEY) || "default"; } catch { return "default"; }
};
const writeId = (id: string): void => {
  try { localStorage.setItem(KEY, id); } catch { /* ignore */ }
};

/** Drives the dynamic theme preset. Mounts on AppShell so every preset
 *  change re-applies CSS vars on documentElement. The light/dark mode is
 *  read from the existing `.dark` class managed by useStore() so it
 *  always tracks `preferences.theme`. */
export function useThemePreset() {
  const [presetId, setPresetIdState] = useState<string>(readId);

  // Re-apply when the preset id OR the .dark class on <html> changes.
  useEffect(() => {
    const apply = () => {
      const isDark = document.documentElement.classList.contains("dark");
      applyPresetVars(getPreset(presetId), isDark);
    };
    apply();
    const obs = new MutationObserver(apply);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, [presetId]);

  const setPresetId = useCallback((id: string) => {
    writeId(id);
    setPresetIdState(id);
  }, []);

  return { presetId, setPresetId, presets: THEME_PRESETS };
}
