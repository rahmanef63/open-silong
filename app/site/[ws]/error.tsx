"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/shared/ui/button";

export default function SiteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") console.error("SiteError:", error);
  }, [error]);

  return (
    <div className="min-h-svh flex items-center justify-center p-6 bg-background">
      <div className="max-w-md w-full rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
        <AlertTriangle className="h-6 w-6 text-destructive mx-auto mb-3" />
        <h2 className="text-base font-semibold mb-1">This site can&apos;t load</h2>
        <p className="text-sm text-muted-foreground mb-4">{error.message || "Unknown error"}</p>
        <div className="flex justify-center gap-2">
          <Button
            onClick={reset}
            className="inline-flex h-auto items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-sm text-background hover:bg-foreground hover:opacity-90 [&_svg]:size-3.5"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </Button>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
          >
            <Home className="h-3.5 w-3.5" /> Home
          </Link>
        </div>
      </div>
    </div>
  );
}
