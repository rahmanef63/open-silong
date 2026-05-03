"use client";

import { useEffect } from "react";

/**
 * Runtime <meta name="theme-color"> updater.
 *
 * Reads the resolved `background-color` of <body> and writes it to the
 * theme-color meta tag whenever the html class list changes (dark-mode
 * toggle) or a tweakcn preset is applied (fires on any root attribute
 * change via MutationObserver).
 *
 * Why: Next.js's static themeColor in metadata is frozen at render
 * time — can't follow the 36 tweakcn presets. This component brings
 * the browser chrome color (Android address bar, iOS status bar in
 * PWA mode) in sync with the active preset.
 *
 * Falls back silently on browsers that don't honor theme-color updates
 * after load.
 */
export function ThemeColorSync() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const ensureMeta = (): HTMLMetaElement => {
      let meta = document.querySelector<HTMLMetaElement>(
        'meta[name="theme-color"]:not([media])',
      );
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = "theme-color";
        document.head.appendChild(meta);
      }
      return meta;
    };

    const update = () => {
      try {
        const body = document.body;
        if (!body) return;
        const bg = window.getComputedStyle(body).backgroundColor;
        if (!bg || bg === "rgba(0, 0, 0, 0)" || bg === "transparent") return;
        ensureMeta().setAttribute("content", bg);
      } catch {
        // Non-fatal — browser chrome simply keeps its default color.
      }
    };

    update();

    const observer = new MutationObserver(() => {
      requestAnimationFrame(update);
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme", "data-preset", "style"],
    });

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onSchemeChange = () => requestAnimationFrame(update);
    if (mq.addEventListener) mq.addEventListener("change", onSchemeChange);

    return () => {
      observer.disconnect();
      if (mq.removeEventListener)
        mq.removeEventListener("change", onSchemeChange);
    };
  }, []);

  return null;
}
