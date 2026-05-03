"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") console.error("DashboardError:", error);
  }, [error]);

  return (
    <div className="h-full min-h-0 flex items-center justify-center p-6 bg-background">
      <div className="max-w-md w-full rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
        <AlertTriangle className="h-6 w-6 text-destructive mx-auto mb-3" />
        <h2 className="text-base font-semibold mb-1">Workspace error</h2>
        <p className="text-sm text-muted-foreground mb-4">{error.message || "Unknown error"}</p>
        {error.digest && (
          <p className="text-xs text-muted-foreground/70 mb-4 font-mono">id: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="inline-flex items-center gap-1.5 rounded-md bg-foreground text-background px-3 py-1.5 text-sm hover:opacity-90"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Try again
        </button>
      </div>
    </div>
  );
}
