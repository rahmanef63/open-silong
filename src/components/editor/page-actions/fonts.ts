import type { PageFont } from "@/lib/types";

export interface FontOption { id: PageFont; label: string; className: string }

export const FONT_OPTIONS: FontOption[] = [
  { id: "default", label: "Default", className: "font-sans" },
  { id: "serif",   label: "Serif",   className: "font-serif" },
  { id: "mono",    label: "Mono",    className: "font-mono" },
];
