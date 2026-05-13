import { REGISTRY_URL } from "./types";
import type { TweakcnPresetItem, TweakcnRegistry } from "./types";

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
