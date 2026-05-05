"use client";

import { useEffect } from "react";
import { isChunkLoadError } from "./ChunkErrorBoundary";
import { hardReload } from "./VersionWatcher";
import { logError } from "@/shared/lib/error";

const RELOAD_FLAG = "nosion:chunk-reloaded-at";
const RELOAD_COOLDOWN_MS = 60_000;

/** Catches chunk-load failures that escape the React tree — async
 *  `import()` rejections in event handlers, lazy load failures from
 *  next/dynamic without a wrapping ErrorBoundary, etc.
 *
 *  Mount once near the root. Pairs with ChunkErrorBoundary which catches
 *  errors thrown inside the React render path. */
export function GlobalErrorListeners() {
  useEffect(() => {
    function maybeReload(err: unknown) {
      if (!isChunkLoadError(err)) {
        // Surface unexpected unhandled errors to the dev console only —
        // production users see nothing here.
        logError("GlobalError", err);
        return;
      }
      try {
        const last = Number(sessionStorage.getItem(RELOAD_FLAG) ?? "0");
        if (Date.now() - last <= RELOAD_COOLDOWN_MS) return; // cooldown
        sessionStorage.setItem(RELOAD_FLAG, String(Date.now()));
      } catch { /* storage disabled */ }
      hardReload();
    }

    function onError(e: ErrorEvent) {
      maybeReload(e.error ?? e.message);
    }
    function onRejection(e: PromiseRejectionEvent) {
      maybeReload(e.reason);
    }

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
