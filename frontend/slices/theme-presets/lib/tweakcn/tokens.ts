export const COLOR_TOKENS = [
  "background", "foreground",
  "card", "card-foreground",
  "popover", "popover-foreground",
  "primary", "primary-foreground",
  "secondary", "secondary-foreground",
  "muted", "muted-foreground",
  "accent", "accent-foreground",
  "destructive", "destructive-foreground",
  "border", "input", "ring",
  "chart-1", "chart-2", "chart-3", "chart-4", "chart-5",
  "sidebar", "sidebar-foreground",
  "sidebar-primary", "sidebar-primary-foreground",
  "sidebar-accent", "sidebar-accent-foreground",
  "sidebar-border", "sidebar-ring",
] as const;

/** Registry uses bare `sidebar`; Nosion's @theme inline maps
 *  `--color-sidebar` from `--sidebar-background`. Emit both alias names
 *  so either resolves. */
export const COLOR_ALIAS: Readonly<Record<string, string>> = {
  sidebar: "sidebar-background",
};

export const PASSTHROUGH_TOKENS = [
  "radius", "spacing",
  "letter-spacing",
  "tracking-normal", "tracking-tight", "tracking-tighter",
  "tracking-wide", "tracking-wider", "tracking-widest",
  "shadow-color", "shadow-opacity", "shadow-blur", "shadow-spread",
  "shadow-offset-x", "shadow-offset-y",
  "shadow-2xs", "shadow-xs", "shadow-sm", "shadow",
  "shadow-md", "shadow-lg", "shadow-xl", "shadow-2xl",
] as const;

export const FONT_TOKENS = ["font-sans", "font-serif", "font-mono"] as const;
