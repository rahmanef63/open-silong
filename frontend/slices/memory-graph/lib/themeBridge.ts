"use client";

/** Canvas can't read Tailwind/shadcn theme tokens — the force-graph paints on
 *  a raw `<canvas>`, so it needs concrete colour strings. `themeBridge` reads
 *  the resolved CSS custom properties off `:root` (`getComputedStyle`) and
 *  re-reads them whenever next-themes flips `.dark` or a tweakcn preset stamps
 *  a new `data-preset` / inline style on the document element — mirroring the
 *  MutationObserver pattern in `theme-presets/ThemeColorSync`.
 *
 *  Values stay as `hsl(H S% L%)` strings (the format used in
 *  `app/globals.css`). Canvas fillStyle accepts them verbatim; `withAlpha`
 *  splices a `/ a` alpha channel (CSS Color 4) for fades/dimming.
 *
 *  Portable: no convex, no store — only the DOM.
 */

import { useEffect, useState } from "react";

export interface GraphTheme {
  /** Canvas background. */
  bg: string;
  /** Node/edge labels. */
  text: string;
  /** Secondary text / dim accents. */
  muted: string;
  /** Border tone (unused fills). */
  border: string;
  /** Regular page node. */
  node: string;
  /** Wiki-verified hub node (brand accent). */
  hub: string;
  /** Tag node (distinct hue). */
  tag: string;
  /** Unresolved ghost node (dim, dashed). */
  ghost: string;
  /** Edge/link stroke. */
  link: string;
}

/** Light-theme fallbacks — used during SSR and before the first client read.
 *  Kept in sync with the `:root` block of `app/globals.css`. */
const FALLBACK: GraphTheme = {
  bg: "hsl(0 0% 100%)",
  text: "hsl(220 13% 13%)",
  muted: "hsl(220 9% 46%)",
  border: "hsl(30 8% 90%)",
  node: "hsl(220 13% 13%)",
  hub: "hsl(24 90% 56%)",
  tag: "hsl(0 72% 51%)",
  ghost: "hsl(220 9% 46%)",
  link: "hsl(30 8% 90%)",
};

function readVar(root: CSSStyleDeclaration, name: string, fallback: string): string {
  const v = root.getPropertyValue(name).trim();
  return v || fallback;
}

/** Read the current theme tokens off `:root`. SSR-safe (returns FALLBACK). */
export function readGraphTheme(): GraphTheme {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return FALLBACK;
  }
  const el = document.documentElement;
  if (!el) return FALLBACK;
  const s = window.getComputedStyle(el);
  return {
    bg: readVar(s, "--background", FALLBACK.bg),
    text: readVar(s, "--foreground", FALLBACK.text),
    muted: readVar(s, "--muted-foreground", FALLBACK.muted),
    border: readVar(s, "--border", FALLBACK.border),
    node: readVar(s, "--primary", FALLBACK.node),
    hub: readVar(s, "--ring", FALLBACK.hub),
    tag: readVar(s, "--destructive", FALLBACK.tag),
    ghost: readVar(s, "--muted-foreground", FALLBACK.ghost),
    link: readVar(s, "--border", FALLBACK.link),
  };
}

/** Splice an alpha channel onto an `hsl(...)` / `rgb(...)` colour string using
 *  the CSS Color 4 `<color> / <alpha>` form (canvas-supported). Falls back to
 *  the untouched colour for shapes it can't parse. */
export function withAlpha(color: string, alpha: number): string {
  const c = (color ?? "").trim();
  const hsl = c.match(/^hsl\(([^)]+)\)$/i);
  if (hsl) return `hsl(${hsl[1].split("/")[0].trim()} / ${alpha})`;
  const rgb = c.match(/^rgb\(([^)]+)\)$/i);
  if (rgb) return `rgb(${rgb[1].split("/")[0].trim()} / ${alpha})`;
  return c;
}

/** Reactive theme tokens — re-reads on next-themes toggle + tweakcn preset
 *  swap + OS colour-scheme change. */
export function useGraphTheme(): GraphTheme {
  const [theme, setTheme] = useState<GraphTheme>(() => readGraphTheme());

  useEffect(() => {
    if (typeof window === "undefined") return;
    const update = () => setTheme(readGraphTheme());
    update();

    const observer = new MutationObserver(() => requestAnimationFrame(update));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme", "data-preset", "style"],
    });

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onScheme = () => requestAnimationFrame(update);
    mq.addEventListener?.("change", onScheme);

    return () => {
      observer.disconnect();
      mq.removeEventListener?.("change", onScheme);
    };
  }, []);

  return theme;
}
