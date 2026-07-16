"use client";

import { type ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { Toaster as SonnerToaster } from "@/shared/ui/sonner";
import { ChunkErrorBoundary } from "@/shared/components/ChunkErrorBoundary";
import { GlobalErrorListeners } from "@/shared/components/GlobalErrorListeners";
import { ServiceWorkerCleanup } from "@/shared/components/ServiceWorkerCleanup";

/** Universal client providers mounted at the ROOT for EVERY route — cheap and
 *  Convex-free: theme, chunk-error recovery, global error listeners, SW
 *  cleanup, and the toast container (sonner's toasts are global, so a single
 *  root Toaster surfaces toasts fired from anywhere, including the (app)
 *  group's VersionWatcher). The expensive Convex realtime/auth stack is scoped
 *  to the (app) group + /forms so anonymous public routes don't boot it. */
export default function RootProviders({ children }: { children: ReactNode }) {
  return (
    <ChunkErrorBoundary>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange={false}
        storageKey="silong-theme"
      >
        <GlobalErrorListeners />
        <ServiceWorkerCleanup />
        <SonnerToaster richColors closeButton />
        {children}
      </ThemeProvider>
    </ChunkErrorBoundary>
  );
}
