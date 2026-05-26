"use client";

import * as React from "react";
import { cn } from "@/shared/lib/utils";
import { parseIconValue, type IconValue } from "../lib/parse";
import { twemojiUrl } from "../lib/twemoji";
import { useIconStyle, type Style } from "../lib/style-pref";
import { LUCIDE_ICONS, FallbackLucideIcon } from "../lib/lucide-icons";
import { PHOSPHOR_ICONS, FallbackPhosphorIcon } from "../lib/phosphor-icons";

interface CommonProps {
  value: string | null | undefined;
  /** Tailwind classes applied to the wrapping span. Sizing can still be
   *  set here (`text-base`, `h-4 w-4`, etc) — twMerge lets a className
   *  `text-*` override the `size` prop default. */
  className?: string;
  /** Fallback emoji or `lucide:Name` shown when value is empty. */
  fallback?: string;
  /** Title for tooltip (a11y). */
  title?: string;
  /** Pixel size for the icon. Drives a CSS var that feeds the wrapper's
   *  font-size; the emoji glyph and lucide/phosphor SVG (via h-[1em])
   *  scale from there. Default 72px (Notion-style hero icon). A
   *  Tailwind `text-*` class in `className` overrides this via twMerge
   *  dedup — so existing call sites that pre-date the prop keep their
   *  visual size. */
  size?: number;
}

/** Recommended default size for hero icons (page covers, etc). Not
 *  applied automatically — callers opt in via `size={DEFAULT_ICON_SIZE}`.
 *  Auto-defaulting would break legacy call sites that rely on the
 *  wrapping element's font-size cascade for sizing. */
export const DEFAULT_ICON_SIZE = 72;

const WRAPPER_BASE = "inline-flex items-center justify-center leading-none";

function sizeProps(size: number | undefined, color: string | undefined): {
  className: string;
  style: React.CSSProperties | undefined;
} {
  // No size prop → no font-size override; legacy parent-cascade /
  // className-driven sizing keeps working.
  if (size === undefined) {
    return { className: WRAPPER_BASE, style: color ? { color } : undefined };
  }
  // Explicit size → inline style for fontSize + box dimensions. Inline
  // style beats Tailwind className, so the picked size is authoritative
  // and not subject to Tailwind JIT picking up arbitrary classes.
  return {
    className: WRAPPER_BASE,
    style: {
      fontSize: size,
      width: size,
      height: size,
      ...(color ? { color } : null),
    },
  };
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

function RawIconImpl({ value, style, className, fallback = "📄", title, size }: RawIconProps) {
  const parsed = React.useMemo(() => resolveValue(value, fallback), [value, fallback]);

  if (parsed.kind === "lucide") {
    const Cmp = LUCIDE_ICONS[parsed.name] ?? FallbackLucideIcon;
    if (Cmp === FallbackLucideIcon && process.env.NODE_ENV !== "production") {
      console.warn(`[DynamicIcon] Unknown lucide icon: "${parsed.name}". Falling back to FileText.`);
    }
    const sp = sizeProps(size, parsed.color);
    return (
      <span className={cn(sp.className, className)} title={title} style={sp.style}>
        <Cmp className="h-[1em] w-[1em]" />
      </span>
    );
  }

  if (parsed.kind === "phosphor") {
    const Cmp = PHOSPHOR_ICONS[parsed.name] ?? FallbackPhosphorIcon;
    if (Cmp === FallbackPhosphorIcon && process.env.NODE_ENV !== "production") {
      console.warn(`[DynamicIcon] Unknown phosphor icon: "${parsed.name}". Falling back to FileText.`);
    }
    const sp = sizeProps(size, parsed.color);
    return (
      <span className={cn(sp.className, className)} title={title} style={sp.style}>
        <Cmp weight="fill" className="h-[1em] w-[1em]" />
      </span>
    );
  }

  const glyph = parsed.kind === "emoji" ? parsed.emoji : "";
  const sp = sizeProps(size, undefined);
  if (style === "twemoji" && glyph) {
    const url = twemojiUrl(glyph);
    if (url) return <TwemojiImg url={url} glyph={glyph} className={className} title={title} size={size} />;
  }
  return (
    <span className={cn(sp.className, className)} title={title} style={sp.style}>
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

function DynamicIconImpl({ value, className, fallback, title, forceNative, size }: DynamicIconProps) {
  const [style] = useIconStyle();
  const effective: Style = forceNative ? "native" : style;
  return <RawIcon value={value} style={effective} className={className} fallback={fallback} title={title} size={size} />;
}

/** Icon renderer that subscribes to the global style preference. Suitable
 *  for one-off renders (page title, sidebar, table cell). Inside large
 *  grids prefer `RawIcon` + parent-level style read. */
export const DynamicIcon = React.memo(DynamicIconImpl);

function TwemojiImgImpl({
  url, glyph, className, title, size,
}: { url: string; glyph: string; className?: string; title?: string; size?: number }) {
  const [failed, setFailed] = React.useState(false);
  const sp = sizeProps(size, undefined);
  if (failed) {
    return (
      <span className={cn(sp.className, className)} title={title ?? glyph} style={sp.style}>
        {glyph}
      </span>
    );
  }
  return (
    <span className={cn(sp.className, className)} style={sp.style}>
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
