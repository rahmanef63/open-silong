"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ShieldAlert, RefreshCw, Home } from "lucide-react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") console.error("AdminError:", error);
  }, [error]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
        <div className="flex justify-center mb-3">
          <div className="rounded-full bg-destructive/10 p-3">
            <ShieldAlert className="h-6 w-6 text-destructive" />
          </div>
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Admin panel error</h2>
        <p className="text-sm text-muted-foreground mb-4">{error.message || "Unknown error"}</p>
        {error.digest && (
          <p className="text-xs text-muted-foreground/70 mb-4 font-mono">id: {error.digest}</p>
        )}
        <div className="flex justify-center gap-2">
          <button
            onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-md bg-foreground text-background px-3 py-1.5 text-sm hover:opacity-90"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Try again
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
          >
            <Home className="h-3.5 w-3.5" /> Workspace
          </Link>
        </div>
      </div>
    </div>
  );
}
