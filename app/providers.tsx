"use client";

import { useState, type ReactNode } from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexAuthNextjsProvider } from "@convex-dev/auth/nextjs";
import { Toaster as SonnerToaster } from "@/shared/ui/sonner";
import { ChunkErrorBoundary } from "@/shared/components/ChunkErrorBoundary";
import { GlobalErrorListeners } from "@/shared/components/GlobalErrorListeners";
import { ServiceWorkerCleanup } from "@/shared/components/ServiceWorkerCleanup";
import { VersionWatcher } from "@/shared/components/VersionWatcher";

export default function Providers({ children }: { children: ReactNode }) {
  const [convex] = useState(
    () => new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL as string),
  );
  return (
    <ChunkErrorBoundary>
      <ConvexAuthNextjsProvider client={convex}>
        <GlobalErrorListeners />
        <ServiceWorkerCleanup />
        <VersionWatcher />
        {/* Mounted at root so the version-update toast also shows on
         *  /auth, /share, and other routes outside DashboardShell. */}
        <SonnerToaster richColors closeButton />
        {children}
      </ConvexAuthNextjsProvider>
    </ChunkErrorBoundary>
  );
}
