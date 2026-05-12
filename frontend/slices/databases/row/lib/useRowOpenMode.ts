"use client";

import { useEffect, useState } from "react";

export type RowOpenMode = "sheet" | "dialog" | "page";

const KEY = "db:row-open-mode";
const DEFAULT: RowOpenMode = "sheet";

function readMode(): RowOpenMode {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const v = localStorage.getItem(KEY);
    if (v === "sheet" || v === "dialog" || v === "page") return v;
  } catch {}
  return DEFAULT;
}

/** Per-user preference for how clicking a database row opens its detail.
 *  Persisted to localStorage; cross-tab sync via the `storage` event. */
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
