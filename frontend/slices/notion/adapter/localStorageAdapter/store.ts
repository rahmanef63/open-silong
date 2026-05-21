"use client";

/**
 * localStorage I/O + reactive event channel for the demo adapter.
 *
 * Storage layout
 * --------------
 *   localStorage["silong-demo:pages"]      = { [id]: Page }
 *   localStorage["silong-demo:databases"]  = { [id]: Database }
 *   localStorage["silong-demo:recents"]    = string[]   (page/db ids)
 *
 * Reactivity
 * ----------
 *   - Same-tab writes dispatch `silong-demo:change` window events.
 *   - Cross-tab writes arrive via the native `storage` event.
 *   - `useStore<T>(selector)` is a `useSyncExternalStore` wrapper that
 *     re-renders when EITHER channel fires. Pass a JSON-stable selector
 *     so React's identity check works (return arrays / objects fresh
 *     from a memoised compute, or use `useStoreEq` variant).
 */

import { useSyncExternalStore } from "react";
import type { Database, Page } from "@/shared/types/domain";

const NS = "silong-demo:";
export const KEYS = {
  pages: `${NS}pages`,
  databases: `${NS}databases`,
  recents: `${NS}recents`,
} as const;

const CHANGE_EVENT = `${NS}change`;

// ─── Raw I/O ────────────────────────────────────────────────────────

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    throw new Error(
      `localStorage quota exceeded — demo adapter cap reached. ` +
        `Wire a real NotionAdapter for production. (${(e as Error).message})`,
    );
  }
  // Same-tab notification. Cross-tab arrives via native `storage` event
  // which fires only on OTHER tabs that share localStorage. Dispatch a
  // CustomEvent so this tab also re-renders.
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { key } }));
  }
}

// ─── Subscriber primitive ───────────────────────────────────────────

function subscribe(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onCustom = () => cb();
  const onStorage = (e: StorageEvent) => {
    if (!e.key || e.key.startsWith(NS)) cb();
  };
  window.addEventListener(CHANGE_EVENT, onCustom);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onCustom);
    window.removeEventListener("storage", onStorage);
  };
}

// useSyncExternalStore requires a stable getSnapshot to avoid render
// loops. We snapshot the full localStorage value on every subscriber
// fire, then memoise per selector via the selector's caller.
export function useDemoStore<T>(selector: () => T): T {
  return useSyncExternalStore(subscribe, selector, selector);
}

// ─── Typed table helpers ────────────────────────────────────────────

export type PagesMap = Record<string, Page>;
export type DatabasesMap = Record<string, Database>;

export function getAllPages(): PagesMap {
  return readJson<PagesMap>(KEYS.pages, {});
}

export function setAllPages(next: PagesMap): void {
  writeJson(KEYS.pages, next);
}

export function getAllDatabases(): DatabasesMap {
  return readJson<DatabasesMap>(KEYS.databases, {});
}

export function setAllDatabases(next: DatabasesMap): void {
  writeJson(KEYS.databases, next);
}

export function getRecents(): string[] {
  return readJson<string[]>(KEYS.recents, []);
}

export function setRecents(next: string[]): void {
  writeJson(KEYS.recents, next);
}

// ─── Id generation ──────────────────────────────────────────────────

export function genId(prefix = "id"): string {
  const rand = (globalThis as { crypto?: Crypto }).crypto?.randomUUID?.();
  return rand ?? `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// ─── Workspace constant ─────────────────────────────────────────────

/** Single hard-coded workspace id. The localStorage adapter is
 *  single-tenant by design — multi-workspace consumers should use the
 *  Convex adapter or roll their own. */
export const DEMO_WORKSPACE_ID = "default";
