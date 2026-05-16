"use client";

import * as React from "react";
import { cn } from "@/shared/lib/utils";
import { parseIconValue, type IconValue } from "../lib/parse";
import { twemojiUrl } from "../lib/twemoji";
import { useIconStyle, type Style } from "../lib/style-pref";
import { LUCIDE_ICONS, FallbackLucideIcon } from "../lib/lucide-icons";

interface CommonProps {
  value: string | null | undefined;
  /** Tailwind classes applied to the wrapping span. Sizing should be set
   *  here (`text-base`, `h-4 w-4`, etc) — both emoji and SVG inherit. */
  className?: string;
  /** Fallback emoji or `lucide:Name` shown when value is empty. */
  fallback?: string;
  /** Title for tooltip (a11y). */
  title?: string;
}

/** Resolve a stored value (or fallback) to a parsed IconValue. */
function resolveValue(value: string | null | undefined, fallback: string): IconValue {
  const primary = parseIconValue(value);
  if (primary.kind === "emoji" && !primary.emoji) return parseIconValue(fallback);
  return primary;
}

interface RawIconProps extends CommonProps {
  /** Explicit render style. When provided, RawIcon does NOT subscribe to
   *  the global style store — caller is responsible for the value. Used
   *  by `IconPickerInline` to read once and broadcast to every grid cell. */
  style: Style;
}

function RawIconImpl({ value, style, className, fallback = "📄", title }: RawIconProps) {
  const parsed = React.useMemo(() => resolveValue(value, fallback), [value, fallback]);

  if (parsed.kind === "lucide") {
    const Cmp = LUCIDE_ICONS[parsed.name] ?? FallbackLucideIcon;
    if (Cmp === FallbackLucideIcon && process.env.NODE_ENV !== "production") {
      console.warn(`[DynamicIcon] Unknown lucide icon: "${parsed.name}". Falling back to FileText.`);
    }
    return (
      <span
        className={cn("inline-flex items-center justify-center leading-none", className)}
        title={title}
        style={parsed.color ? { color: parsed.color } : undefined}
      >
        <Cmp className="h-[1em] w-[1em]" />
      </span>
    );
  }

  const glyph = parsed.kind === "emoji" ? parsed.emoji : "";
  if (style === "twemoji" && glyph) {
    const url = twemojiUrl(glyph);
    if (url) return <TwemojiImg url={url} glyph={glyph} className={className} title={title} />;
  }
  return (
    <span className={cn("inline-flex items-center justify-center leading-none", className)} title={title}>
      {glyph}
    </span>
  );
}

/** Stateless icon renderer. Memoized on all props — re-renders only when
 *  value/style/className change. Use this inside grids / lists where the
 *  parent already knows the style; it skips the global store
 *  subscription entirely. */
export const RawIcon = React.memo(RawIconImpl);

interface DynamicIconProps extends CommonProps {
  /** Force native emoji rendering even when twemoji preference is on.
   *  Used in pickers where we want to preview the OS glyph. */
  forceNative?: boolean;
}

function DynamicIconImpl({ value, className, fallback, title, forceNative }: DynamicIconProps) {
  const [style] = useIconStyle();
  const effective: Style = forceNative ? "native" : style;
  return <RawIcon value={value} style={effective} className={className} fallback={fallback} title={title} />;
}

/** Icon renderer that subscribes to the global style preference. Suitable
 *  for one-off renders (page title, sidebar, table cell). Inside large
 *  grids prefer `RawIcon` + parent-level style read. */
export const DynamicIcon = React.memo(DynamicIconImpl);

function TwemojiImgImpl({
  url, glyph, className, title,
}: { url: string; glyph: string; className?: string; title?: string }) {
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
      {/* eslint-disable-next-line @next/next/no-img-element -- external SVG CDN; next/image can't optimize without custom loader */}
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

const TwemojiImg = React.memo(TwemojiImgImpl);
