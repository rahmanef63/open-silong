"use client";

import { useEffect } from "react";

/** Defensive: unregister any leftover service worker. The app is not a
 *  PWA, but earlier deploys (or third-party libs) may have installed one.
 *  A stale SW happily serves cached HTML pointing at deleted chunk
 *  filenames, producing the "Failed to load chunk" error. Drop it on
 *  every boot — registration cost is one-time per browser. */
export function ServiceWorkerCleanup() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    let cancelled = false;

    (async () => {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        if (cancelled || regs.length === 0) return;
        await Promise.all(regs.map((r) => r.unregister().catch(() => false)));
        // Also clear CacheStorage entries that stale SWs may have stuffed.
        if (typeof caches !== "undefined") {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k).catch(() => false)));
        }
      } catch {
        // Some browsers throw under file:// or restricted contexts. Ignore.
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return null;
}
