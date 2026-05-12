"use client";

import { useEffect, useState } from "react";

/** The two surfaces that can be the user's *default* on row-click.
 *  "page" is intentionally NOT persistable — it's a one-shot navigation
 *  action triggered from the switcher inside an already-open peek. */
export type RowOpenMode = "sheet" | "dialog";

const KEY = "db:row-open-mode";
const DEFAULT: RowOpenMode = "sheet";

function readMode(): RowOpenMode {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const v = localStorage.getItem(KEY);
    if (v === "sheet" || v === "dialog") return v;
    // Migrate legacy "page" preference back to the safe default. Earlier
    // versions persisted "page" as a default, which caused row-clicks to
    // navigate straight to /p/<id> with no peek. Reset on read.
    if (v === "page") {
      try { localStorage.setItem(KEY, DEFAULT); } catch {}
      return DEFAULT;
    }
  } catch {}
  return DEFAULT;
}

/** Persisted per-user default for how clicking a database row opens its
 *  detail. Only "sheet" or "dialog" — "page" is a one-shot action, not a
 *  persistable default. Cross-tab sync via the `storage` event. */
export function useRowOpenMode(): [RowOpenMode, (m: RowOpenMode) => void] {
  const [mode, setMode] = useState<RowOpenMode>(DEFAULT);

  useEffect(() => {
    setMode(readMode());
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setMode(readMode());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const set = (m: RowOpenMode) => {
    setMode(m);
    try { localStorage.setItem(KEY, m); } catch {}
  };

  return [mode, set];
}
