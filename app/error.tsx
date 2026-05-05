"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { isChunkLoadError } from "@/shared/components/ChunkErrorBoundary";
import { hardReload } from "@/shared/components/VersionWatcher";
import { sanitizeError, logError } from "@/shared/lib/error";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Stale-deploy chunk error → reload immediately with cache-bust.
  // ChunkErrorBoundary in Providers handles most cases, but route-level
  // errors land here directly so we mirror the recovery.
  const isStaleChunk = isChunkLoadError(error);
  const safe = sanitizeError(error);

  useEffect(() => {
    logError("RouteError", error, { digest: error.digest });
    if (isStaleChunk) {
      const FLAG = "nosion:chunk-reloaded-at";
      try {
        const last = Number(sessionStorage.getItem(FLAG) ?? "0");
        if (Date.now() - last > 60_000) {
          sessionStorage.setItem(FLAG, String(Date.now()));
          hardReload();
        }
      } catch { hardReload(); }
    }
  }, [error, isStaleChunk]);

  if (isStaleChunk) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="max-w-md w-full rounded-lg border border-border bg-card p-6 text-center">
          <div className="text-3xl mb-2">🔄</div>
          <h2 className="text-base font-semibold mb-1">Update available</h2>
          <p className="text-sm text-muted-foreground mb-4">
            The app was updated while you were here. Reloading…
          </p>
          <button
            onClick={hardReload}
            className="rounded-md bg-foreground text-background px-3 py-1.5 text-sm hover:opacity-90"
          >
            Reload now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="max-w-md w-full rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
        <div className="flex justify-center mb-3">
          <div className="rounded-full bg-destructive/10 p-3">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Something went wrong</h2>
        <p className="text-sm text-muted-foreground mb-4">{safe.message}</p>
        {error.digest && (
          <p className="text-xs text-muted-foreground/70 mb-4 font-mono">id: {error.digest}</p>
        )}
        <div className="flex justify-center gap-2">
          <button
            onClick={reset}
            className="flex items-center gap-1.5 rounded-md bg-foreground text-background px-3 py-1.5 text-sm hover:opacity-90"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Try again
          </button>
          <button
            onClick={hardReload}
            className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
          >
            Hard reload
          </button>
        </div>
      </div>
    </div>
  );
}
