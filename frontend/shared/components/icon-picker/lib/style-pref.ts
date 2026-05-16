"use client";

import { useSyncExternalStore } from "react";

/** Per-device preference for emoji rendering: Twemoji SVGs (Notion-like,
 *  consistent across devices) vs native OS font.
 *
 *  Backed by a SINGLETON external store + `useSyncExternalStore` so any
 *  number of `<DynamicIcon>` instances share a single localStorage read
 *  and a single storage-event listener. Previous implementation attached
 *  one listener per icon — which exploded to 800+ in the picker grid. */

const KEY = "nosion:iconStyle";
const DEFAULT: Style = "twemoji";

export type Style = "twemoji" | "native";

function isStyle(v: unknown): v is Style {
  return v === "twemoji" || v === "native";
}

function read(): Style {
  if (typeof window === "undefined") return DEFAULT;
  const raw = window.localStorage.getItem(KEY);
  return isStyle(raw) ? raw : DEFAULT;
}

// Module-singleton state. Hydrated lazily on first client read so SSR
// renders are stable (always DEFAULT) — first client paint may flicker
// if user picked "native" previously, but that's the cost of avoiding
// theme-flash mismatches. Same pattern as next-themes.
let current: Style = DEFAULT;
let hydrated = false;
const listeners = new Set<() => void>();

function ensureHydrated() {
  if (hydrated || typeof window === "undefined") return;
  current = read();
  hydrated = true;
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY) return;
    const next = read();
    if (next === current) return;
    current = next;
    listeners.forEach((l) => l());
  });
}

function subscribe(cb: () => void): () => void {
  ensureHydrated();
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot(): Style {
  ensureHydrated();
  return current;
}

function getServerSnapshot(): Style {
  return DEFAULT;
}

/** Update the global preference. Writes localStorage + notifies every
 *  subscribed component in one batch. */
export function setIconStyle(next: Style): void {
  if (next === current) return;
  current = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, next);
    } catch {
      // Quota / private mode — surface in console but don't break.
      console.warn("[iconStyle] localStorage write failed");
    }
  }
  listeners.forEach((l) => l());
}

/** Read the current style synchronously (no subscription). Useful in
 *  one-shot callbacks where you don't need to re-render on change. */
export function readIconStyle(): Style {
  return getSnapshot();
}

/** Hook returning `[style, set]`. Single subscription per component.
 *  Picker grids should NOT call this per cell — read once at the picker
 *  level and pass `style` down as a prop to `RawIcon`. */
export function useIconStyle(): [Style, (next: Style) => void] {
  const style = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return [style, setIconStyle];
}
