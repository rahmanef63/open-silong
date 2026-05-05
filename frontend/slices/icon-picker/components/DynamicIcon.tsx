"use client";

import * as React from "react";
import * as LucideIcons from "lucide-react";
import { FileText } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { parseIconValue } from "../lib/parse";

type IconMap = Record<string, React.ComponentType<{ className?: string }>>;

interface Props {
  value: string | null | undefined;
  /** Tailwind classes applied to the wrapping span. Sizing should be set
   *  here (`text-base`, `h-4 w-4`, etc) — both emoji glyph and SVG inherit. */
  className?: string;
  /** Fallback emoji shown when value is empty. Default: 📄 */
  fallback?: string;
  /** Title for tooltip (a11y). */
  title?: string;
}

/** Renders either a raw emoji glyph or a lucide-react SVG depending on the
 *  stored value. Use everywhere `page.icon` is shown. */
export function DynamicIcon({ value, className, fallback = "📄", title }: Props) {
  const parsed = parseIconValue(value);

  if (parsed.kind === "lucide") {
    const Cmp = (LucideIcons as unknown as IconMap)[parsed.name] ?? FileText;
    return (
      <span className={cn("inline-flex items-center justify-center leading-none", className)} title={title}>
        <Cmp className="h-[1em] w-[1em]" />
      </span>
    );
  }

  const glyph = parsed.kind === "emoji" ? parsed.emoji : fallback;
  return (
    <span className={cn("inline-flex items-center justify-center leading-none", className)} title={title}>
      {glyph}
    </span>
  );
}
