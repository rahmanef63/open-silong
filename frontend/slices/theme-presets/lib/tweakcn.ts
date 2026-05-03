/**
 * Tweakcn theme preset loader for Nosion.
 *
 * Augments the existing simple `theme-presets` slice (presets.ts) with
 * the full ~36-preset tweakcn registry served from `/r/registry.json`.
 *
 * Architecture notes (Nosion-specific):
 *
 *   - Nosion's `app/globals.css` defines Tailwind 4 `@theme inline`
 *     mappings as `--color-X: hsl(var(--X))`. Stripping the registry's
 *     `oklch(...)` wrapper would yield bare `0.5 0.1 259` triples that
 *     `hsl()` cannot parse. So we KEEP the wrapper intact and override
 *     the `--color-*` Tailwind theme tokens DIRECTLY (`--color-primary:
 *     oklch(...)`). Tailwind utility classes (`bg-primary`, `text-fg`,
 *     etc.) read those vars and follow the preset.
 *
 *   - Direct `hsl(var(--primary))` consumers (a handful of inline-style
 *     SVG fills in slices/databases/views/MapView and admin-panel charts)
 *     keep showing the BASE palette. Acceptable trade-off; they are
 *     ornament-only and not bound to brand identity.
 *
 *   - Brand-bridge: also emit `--color-brand` from `--primary` so the
 *     existing `bg-brand`, `text-brand-foreground` utilities (used
 *     throughout Nosion as the orange CTA accent) follow the preset.
 *
 *   - Registry tokens are emitted to BOTH `--color-X` (Tailwind theme)
 *     AND `--X` (raw — preserves `var(--ring)` style references that
 *     don't go through hsl wrapping).
 *
 *   - One `<style id="tweakcn-vars">` tag injected per apply.
 *
 * Public API:
 *   applyTweakcnPreset(name)       — commit + persist
 *   previewTweakcnPreset(name)     — apply without persist
 *   restoreTweakcnPreset()         — re-apply persisted (or clear)
 *   getSavedTweakcnPreset()        — read persisted name | null
 *   clearTweakcnPreset()           — wipe vars + persistence
 *   bootTweakcnPreset()            — re-apply persisted on first mount
 *   loadTweakcnRegistry()          — fetch + cache /r/registry.json
 *   TWEAKCN_PRESET_GROUPS          — curated mood groupings
 *   tweakcnSwatches(preset)        — 5-color preview tile values
 *   groupTweakcnPresets(items)     — group by TWEAKCN_PRESET_GROUPS
 */

const STORAGE_KEY = "nosion:theme-preset";
const STYLE_ID = "tweakcn-vars";
const REGISTRY_URL = "/r/registry.json";

// ---------------------------------------------------------------------------
// Registry shapes
// ---------------------------------------------------------------------------

export interface TweakcnPresetItem {
  name: string;
  title: string;
  type?: string;
  description?: string;
  cssVars?: {
    theme?: Record<string, string>;
    light?: Record<string, string>;
    dark?: Record<string, string>;
  };
}

export interface TweakcnRegistry {
  name: string;
  items: TweakcnPresetItem[];
}

// ---------------------------------------------------------------------------
// Token classification
// ---------------------------------------------------------------------------

const COLOR_TOKENS = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "destructive-foreground",
  "border",
  "input",
  "ring",
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
  "sidebar",
  "sidebar-foreground",
  "sidebar-primary",
  "sidebar-primary-foreground",
  "sidebar-accent",
  "sidebar-accent-foreground",
  "sidebar-border",
  "sidebar-ring",
] as const;

// Registry uses bare `sidebar`; Nosion's @theme inline maps
// `--color-sidebar` from `--sidebar-background`. Emit both alias names
// so either resolves.
const COLOR_ALIAS: Readonly<Record<string, string>> = {
  sidebar: "sidebar-background",
};

const PASSTHROUGH_TOKENS = [
  "radius",
  "spacing",
  "letter-spacing",
  "tracking-normal",
  "tracking-tight",
  "tracking-tighter",
  "tracking-wide",
  "tracking-wider",
  "tracking-widest",
  "shadow-color",
  "shadow-opacity",
  "shadow-blur",
  "shadow-spread",
  "shadow-offset-x",
  "shadow-offset-y",
  "shadow-2xs",
  "shadow-xs",
  "shadow-sm",
  "shadow",
  "shadow-md",
  "shadow-lg",
  "shadow-xl",
  "shadow-2xl",
] as const;

const FONT_TOKENS = ["font-sans", "font-serif", "font-mono"] as const;

// ---------------------------------------------------------------------------
// Block builder — preserves the full color() wrapper.
// ---------------------------------------------------------------------------

function buildBlock(
  selector: string,
  vars: Record<string, string>,
): string | null {
  const lines: string[] = [];
  for (const key of COLOR_TOKENS) {
    const v = vars[key];
    if (!v) continue;
    const value = v.trim();
    const outKey = COLOR_ALIAS[key] ?? key;
    // Override the Tailwind 4 @theme-inline mapping directly.
    lines.push(`  --color-${outKey}: ${value};`);
    // Also emit the raw token name so direct `var(--ring)` refs work.
    lines.push(`  --${outKey}: ${value};`);
    if (COLOR_ALIAS[key]) {
      lines.push(`  --color-${key}: ${value};`);
      lines.push(`  --${key}: ${value};`);
    }
  }
  for (const key of PASSTHROUGH_TOKENS) {
    const v = vars[key];
    if (v) lines.push(`  --${key}: ${v};`);
  }
  for (const key of FONT_TOKENS) {
    const v = vars[key];
    if (v) {
      lines.push(`  --${key}: ${v};`);
      // Also override the Tailwind theme font tokens.
      lines.push(`  --color-${key}: ${v};`);
    }
  }
  if (!lines.length) return null;
  return `${selector} {\n${lines.join("\n")}\n}`;
}

/** Mirror primary into Nosion's `--brand*` aliases so existing `bg-brand`
 *  utilities follow the preset. */
function buildBrandBridge(light: Record<string, string>): string | null {
  const primary = light.primary?.trim();
  if (!primary) return null;
  const primaryFg = light["primary-foreground"]?.trim() ?? "oklch(1 0 0)";
  const brandSoft = light.secondary?.trim() ?? light.accent?.trim() ?? primary;
  return [
    `:root {`,
    `  --color-brand: ${primary};`,
    `  --brand: ${primary};`,
    `  --color-brand-foreground: ${primaryFg};`,
    `  --brand-foreground: ${primaryFg};`,
    `  --color-brand-soft: ${brandSoft};`,
    `  --brand-soft: ${brandSoft};`,
    `}`,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Registry cache
// ---------------------------------------------------------------------------

let registryCache: TweakcnRegistry | null = null;
let registryPromise: Promise<TweakcnRegistry> | null = null;

export async function loadTweakcnRegistry(): Promise<TweakcnRegistry> {
  if (registryCache) return registryCache;
  if (registryPromise) return registryPromise;
  registryPromise = fetch(REGISTRY_URL, { cache: "force-cache" })
    .then((r) => {
      if (!r.ok) throw new Error(`registry.json ${r.status}`);
      return r.json() as Promise<TweakcnRegistry>;
    })
    .then((data) => {
      const items = data.items.filter(
        (i) => i.cssVars?.light && i.cssVars?.dark,
      );
      registryCache = { ...data, items };
      return registryCache;
    });
  return registryPromise;
}

export function findTweakcnPreset(
  registry: TweakcnRegistry,
  name: string,
): TweakcnPresetItem | undefined {
  return registry.items.find((i) => i.name === name);
}

/** 5 signature swatches for dropdown preview. */
export function tweakcnSwatches(preset: TweakcnPresetItem): string[] {
  const v = preset.cssVars?.light ?? preset.cssVars?.dark ?? {};
  return [
    v.background ?? "oklch(1 0 0)",
    v.foreground ?? "oklch(0 0 0)",
    v.primary ?? "oklch(0.5 0.1 259)",
    v.accent ?? "oklch(0.5 0.1 200)",
    v.destructive ?? "oklch(0.6 0.2 25)",
  ];
}

// ---------------------------------------------------------------------------
// Style tag injection
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Apply / preview / restore
// ---------------------------------------------------------------------------

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
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    return;
  }
  await writeVars(name);
  try {
    localStorage.setItem(STORAGE_KEY, name);
  } catch {
    // ignore
  }
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
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Wipe vars + persistence. */
export function clearTweakcnPreset(): void {
  removeStyleTag();
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** Boot: re-apply persisted preset on first client mount. */
export async function bootTweakcnPreset(): Promise<void> {
  const saved = getSavedTweakcnPreset();
  if (!saved) return;
  await writeVars(saved);
}

// ---------------------------------------------------------------------------
// Curated grouping by mood
// ---------------------------------------------------------------------------

export const TWEAKCN_PRESET_GROUPS: ReadonlyArray<{
  id: string;
  label: string;
  presets: ReadonlyArray<string>;
}> = [
  {
    id: "brutalism",
    label: "Brutalism",
    presets: ["neo-brutalism", "doom-64", "retro-arcade", "cyberpunk"],
  },
  {
    id: "refined",
    label: "Refined",
    presets: [
      "modern-minimal",
      "vercel",
      "claude",
      "supabase",
      "mono",
      "graphite",
      "clean-slate",
      "amber-minimal",
    ],
  },
  {
    id: "bold",
    label: "Bold",
    presets: ["t3-chat", "bold-tech", "twitter", "tangerine", "quantum-rose"],
  },
  {
    id: "warm",
    label: "Warm",
    presets: [
      "mocha-mousse",
      "solar-dusk",
      "caffeine",
      "vintage-paper",
      "sunset-horizon",
    ],
  },
  {
    id: "artistic",
    label: "Artistic",
    presets: [
      "claymorphism",
      "kodama-grove",
      "bubblegum",
      "candyland",
      "nature",
      "pastel-dreams",
      "northern-lights",
    ],
  },
  {
    id: "moody",
    label: "Dark & Moody",
    presets: [
      "cosmic-night",
      "perpetuity",
      "catppuccin",
      "elegant-luxury",
      "ocean-breeze",
      "midnight-bloom",
      "starry-night",
    ],
  },
];

export interface TweakcnPresetMeta {
  name: string;
  title: string;
}

export interface TweakcnPresetGroup<
  T extends TweakcnPresetMeta = TweakcnPresetMeta,
> {
  id: string;
  label: string;
  items: T[];
}

export function groupTweakcnPresets<T extends TweakcnPresetMeta>(
  all: T[],
): TweakcnPresetGroup<T>[] {
  const byName = new Map(all.map((p) => [p.name, p]));
  const seen = new Set<string>();
  const grouped: TweakcnPresetGroup<T>[] = TWEAKCN_PRESET_GROUPS.map((g) => ({
    id: g.id,
    label: g.label,
    items: g.presets
      .map((n) => byName.get(n))
      .filter((x): x is T => {
        if (!x) return false;
        seen.add(x.name);
        return true;
      }),
  })).filter((g) => g.items.length > 0);

  const rest = all.filter((p) => !seen.has(p.name));
  if (rest.length) {
    grouped.push({ id: "other", label: "Other", items: rest });
  }
  return grouped;
}
