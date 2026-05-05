"use client";

import * as React from "react";
import * as LucideIcons from "lucide-react";
import { FileText } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { parseIconValue } from "../lib/parse";
import { twemojiUrl } from "../lib/twemoji";
import { useIconStyle } from "../lib/style-pref";

type IconMap = Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>>;

interface Props {
  value: string | null | undefined;
  /** Tailwind classes applied to the wrapping span. Sizing should be set
   *  here (`text-base`, `h-4 w-4`, etc) — both emoji and SVG inherit. */
  className?: string;
  /** Fallback emoji shown when value is empty. Default: 📄 */
  fallback?: string;
  /** Title for tooltip (a11y). */
  title?: string;
  /** Force native emoji rendering even when twemoji preference is on.
   *  Used in pickers so the user sees the OS rendering of what they pick. */
  forceNative?: boolean;
}

/** Renders icon for a stored value. Three modes:
 *   - lucide:Name      → SVG component, color from `?c=hex`
 *   - emoji (twemoji)  → <img> from jsDelivr CDN, fallback to native
 *   - emoji (native)   → OS font glyph in a span
 *  Backwards-compat with all existing emoji-only icon strings. */
export function DynamicIcon({ value, className, fallback = "📄", title, forceNative }: Props) {
  const parsed = parseIconValue(value);
  const [style] = useIconStyle();
  const useTwemoji = style === "twemoji" && !forceNative;

  if (parsed.kind === "lucide") {
    const Cmp = (LucideIcons as unknown as IconMap)[parsed.name];
    if (!Cmp && process.env.NODE_ENV !== "production") {
      console.warn(`[DynamicIcon] Unknown lucide icon: "${parsed.name}". Falling back to FileText.`);
    }
    const Resolved = Cmp ?? FileText;
    return (
      <span
        className={cn("inline-flex items-center justify-center leading-none", className)}
        title={title}
        style={parsed.color ? { color: parsed.color } : undefined}
      >
        <Resolved className="h-[1em] w-[1em]" />
      </span>
    );
  }

  const glyph = parsed.kind === "emoji" ? parsed.emoji : fallback;

  if (useTwemoji) {
    const url = twemojiUrl(glyph);
    if (url) return <TwemojiImg url={url} glyph={glyph} className={className} title={title} />;
  }

  return (
    <span className={cn("inline-flex items-center justify-center leading-none", className)} title={title}>
      {glyph}
    </span>
  );
}

function TwemojiImg({ url, glyph, className, title }: { url: string; glyph: string; className?: string; title?: string }) {
  const [failed, setFailed] = React.useState(false);
  if (failed) {
    return (
      <span className={cn("inline-flex items-center justify-center leading-none", className)} title={title ?? glyph}>
        {glyph}
      </span>
    );
  }
  return (
    <span className={cn("inline-flex items-center justify-center leading-none", className)}>
      <img
        src={url}
        alt={glyph}
        title={title ?? glyph}
        loading="lazy"
        decoding="async"
        draggable={false}
        onError={() => setFailed(true)}
        className="h-[1em] w-[1em] select-none object-contain"
      />
    </span>
  );
}
