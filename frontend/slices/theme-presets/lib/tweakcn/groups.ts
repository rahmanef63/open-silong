import type { TweakcnPresetGroup, TweakcnPresetMeta } from "./types";

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
      "modern-minimal", "vercel", "claude", "supabase",
      "mono", "graphite", "clean-slate", "amber-minimal",
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
    presets: ["mocha-mousse", "solar-dusk", "caffeine", "vintage-paper", "sunset-horizon"],
  },
  {
    id: "artistic",
    label: "Artistic",
    presets: [
      "claymorphism", "kodama-grove", "bubblegum", "candyland",
      "nature", "pastel-dreams", "northern-lights",
    ],
  },
  {
    id: "moody",
    label: "Dark & Moody",
    presets: [
      "cosmic-night", "perpetuity", "catppuccin", "elegant-luxury",
      "ocean-breeze", "midnight-bloom", "starry-night",
    ],
  },
];

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
