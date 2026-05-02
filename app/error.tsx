"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") console.error("RouteError:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="max-w-md w-full rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
        <div className="flex justify-center mb-3">
          <div className="rounded-full bg-destructive/10 p-3">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Something went wrong</h2>
        <p className="text-sm text-muted-foreground mb-4">{error.message || "Unknown error"}</p>
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
        </div>
      </div>
    </div>
  );
}
