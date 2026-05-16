"use client";

import { useSyncExternalStore } from "react";

/** Recently-picked icons ring buffer. Singleton localStorage-backed store,
 *  so every IconPicker instance shares one history (cross-tab via storage
 *  event). 24 slots is enough for "I picked it last week" recall without
 *  pushing meaningful categories off-screen. */

const KEY = "nosion:iconRecents";
const MAX = 24;

let cache: string[] = [];
let hydrated = false;
const listeners = new Set<() => void>();

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr)
      ? arr.filter((v): v is string => typeof v === "string" && v.length > 0).slice(0, MAX)
      : [];
  } catch {
    return [];
  }
}

function persist(arr: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(arr));
  } catch {
    // Ignore quota / private-mode errors.
  }
}

function ensureHydrated() {
  if (hydrated || typeof window === "undefined") return;
  cache = read();
  hydrated = true;
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY) return;
    cache = read();
    listeners.forEach((l) => l());
  });
}

function subscribe(cb: () => void): () => void {
  ensureHydrated();
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot(): string[] {
  ensureHydrated();
  return cache;
}

function getServerSnapshot(): string[] {
  return [];
}

/** Promote a value to the front of the recents list. Dedupes by raw
 *  string match (so `"lucide:Star?c=ff0000"` and `"lucide:Star"` are
 *  treated as distinct entries — color is part of the identity for
 *  this UX). */
export function pushRecent(value: string): void {
  if (!value) return;
  const next = [value, ...cache.filter((v) => v !== value)].slice(0, MAX);
  cache = next;
  persist(next);
  listeners.forEach((l) => l());
}

/** Clear the recents list. */
export function clearRecents(): void {
  cache = [];
  persist(cache);
  listeners.forEach((l) => l());
}

/** Hook returning the current ring. Re-renders only when the list
 *  identity actually changes. */
export function useRecentIcons(): readonly string[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
