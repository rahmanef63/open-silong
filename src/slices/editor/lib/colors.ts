/** Notion-style block color palette. Tailwind classes inlined so JIT picks them up. */
export const BLOCK_COLORS = {
  default: { label: "Default", text: "", bg: "", swatch: "bg-foreground" },
  gray:    { label: "Gray",    text: "text-zinc-500",                       bg: "bg-zinc-100 dark:bg-zinc-800/60",         swatch: "bg-zinc-400" },
  brown:   { label: "Brown",   text: "text-amber-800 dark:text-amber-600",  bg: "bg-amber-50 dark:bg-amber-950/40",        swatch: "bg-amber-700" },
  orange:  { label: "Orange",  text: "text-orange-600",                     bg: "bg-orange-50 dark:bg-orange-950/40",      swatch: "bg-orange-500" },
  yellow:  { label: "Yellow",  text: "text-yellow-600 dark:text-yellow-400",bg: "bg-yellow-50 dark:bg-yellow-950/40",      swatch: "bg-yellow-400" },
  green:   { label: "Green",   text: "text-green-600",                      bg: "bg-green-50 dark:bg-green-950/40",        swatch: "bg-green-500" },
  blue:    { label: "Blue",    text: "text-blue-600",                       bg: "bg-blue-50 dark:bg-blue-950/40",          swatch: "bg-blue-500" },
  purple:  { label: "Purple",  text: "text-purple-600",                     bg: "bg-purple-50 dark:bg-purple-950/40",      swatch: "bg-purple-500" },
  pink:    { label: "Pink",    text: "text-pink-600",                       bg: "bg-pink-50 dark:bg-pink-950/40",          swatch: "bg-pink-500" },
  red:     { label: "Red",     text: "text-red-600",                        bg: "bg-red-50 dark:bg-red-950/40",            swatch: "bg-red-500" },
} as const;

export type BlockColorKey = keyof typeof BLOCK_COLORS;

export const BLOCK_COLOR_KEYS = Object.keys(BLOCK_COLORS) as BlockColorKey[];

export function colorClass(key: string | undefined): string {
  if (!key) return "";
  return BLOCK_COLORS[key as BlockColorKey]?.text ?? "";
}

export function bgColorClass(key: string | undefined): string {
  if (!key) return "";
  return BLOCK_COLORS[key as BlockColorKey]?.bg ?? "";
}
