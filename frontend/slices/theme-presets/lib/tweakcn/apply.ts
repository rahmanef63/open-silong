import { STORAGE_KEY, STYLE_ID } from "./types";
import { buildBlock, buildBrandBridge } from "./cssBuilder";
import { findTweakcnPreset, loadTweakcnRegistry } from "./registry";

function injectStyleTag(css: string): void {
  if (typeof document === "undefined") return;
  let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = STYLE_ID;
    document.head.appendChild(el);
  }
  el.textContent = css;
}

function removeStyleTag(): void {
  if (typeof document === "undefined") return;
  document.getElementById(STYLE_ID)?.remove();
}

async function writeVars(name: string): Promise<void> {
  const reg = await loadTweakcnRegistry();
  const preset = findTweakcnPreset(reg, name);
  if (!preset) return;
  const blocks: string[] = [];
  const theme = preset.cssVars?.theme;
  const light = preset.cssVars?.light;
  const dark = preset.cssVars?.dark;
  if (theme) {
    const b = buildBlock(":root", theme);
    if (b) blocks.push(b);
  }
  if (light) {
    const b = buildBlock(":root", light);
    if (b) blocks.push(b);
    const bridge = buildBrandBridge(light);
    if (bridge) blocks.push(bridge);
  }
  if (dark) {
    const b = buildBlock(".dark", dark);
    if (b) blocks.push(b);
  }
  injectStyleTag(blocks.join("\n\n"));
}

/** Commit preset: apply vars + persist. Pass `null` to clear. */
export async function applyTweakcnPreset(name: string | null): Promise<void> {
  if (!name) {
    removeStyleTag();
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    return;
  }
  await writeVars(name);
  try { localStorage.setItem(STORAGE_KEY, name); } catch { /* ignore */ }
}

/** Preview without persisting. */
export async function previewTweakcnPreset(name: string | null): Promise<void> {
  if (!name) {
    removeStyleTag();
    return;
  }
  await writeVars(name);
}

/** Re-apply the persisted preset (or clear if none). */
export async function restoreTweakcnPreset(): Promise<void> {
  const saved = getSavedTweakcnPreset();
  if (!saved) {
    removeStyleTag();
    return;
  }
  await writeVars(saved);
}

export function getSavedTweakcnPreset(): string | null {
  if (typeof window === "undefined") return null;
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}

/** Wipe vars + persistence. */
export function clearTweakcnPreset(): void {
  removeStyleTag();
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}

/** Boot: re-apply persisted preset on first client mount. */
export async function bootTweakcnPreset(): Promise<void> {
  const saved = getSavedTweakcnPreset();
  if (!saved) return;
  await writeVars(saved);
}
