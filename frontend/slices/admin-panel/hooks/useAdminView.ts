"use client";

import { useCallback, useEffect, useState } from "react";
import type { AdminView } from "../components/ViewSwitcher";

/** Persist the per-tab view choice in localStorage. Default is the first
 *  entry of `available` (callers pass "table" first to honor the
 *  "everything defaults to table" rule). SSR-safe: stays at default on
 *  the server, hydrates from localStorage on mount. */
export function useAdminView(
  tabId: string,
  available: readonly AdminView[],
): [AdminView, (v: AdminView) => void] {
  const fallback = available[0];
  const [view, setView] = useState<AdminView>(fallback);

  const key = `admin-view:${tabId}`;

  useEffect(() => {
    try {
      const stored = typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
      if (stored && (available as readonly string[]).includes(stored)) {
        setView(stored as AdminView);
      }
    } catch {
      /* localStorage unavailable */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const update = useCallback(
    (v: AdminView) => {
      setView(v);
      try {
        if (typeof window !== "undefined") window.localStorage.setItem(key, v);
      } catch {
        /* localStorage unavailable */
      }
    },
    [key],
  );

  return [view, update];
}
