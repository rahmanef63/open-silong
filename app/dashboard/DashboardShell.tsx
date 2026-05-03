"use client";

import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { useConvexAuth } from "convex/react";
import { ErrorBoundary } from "@/shared/components/ErrorBoundary";
import { RouteSkeleton, PageBodySkeleton } from "@/shared/components/RouteSkeleton";
import { TooltipProvider } from "@/shared/ui/tooltip";
import { Toaster } from "@/shared/ui/toaster";
import { Toaster as Sonner } from "@/shared/ui/sonner";
import { StoreProvider } from "@/shared/lib/store";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/shared/ui/sidebar";
import { ThreeColumnLayout } from "@/shared/ui/three-column-layout";
import { AppSidebar, PagesPanel } from "@/slices/workspace-sidebar";
import { SearchModal } from "@/slices/command-palette/components/SearchModal";
import { useThemePreset } from "@/slices/theme-presets";
import { MobileBottomNav } from "@/slices/mobile-nav";

const CommandPalette = lazy(() =>
  import("@/slices/command-palette").then((m) => ({ default: m.CommandPalette })),
);

function AuthGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  if (isLoading) return <RouteSkeleton />;
  if (!isAuthenticated) {
    if (typeof window !== "undefined") window.location.replace("/auth");
    return <RouteSkeleton />;
  }
  return <>{children}</>;
}

export default function DashboardShell({ children }: { children: ReactNode }) {
  useThemePreset();
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add("theme-transition");
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Radix aria-hidden focus warning suppression — see git history.
  useEffect(() => {
    const observer = new MutationObserver((records) => {
      for (const r of records) {
        if (r.attributeName !== "aria-hidden") continue;
        const el = r.target as HTMLElement;
        if (el.getAttribute("aria-hidden") !== "true") continue;
        const focused = document.activeElement as HTMLElement | null;
        if (focused && focused !== document.body && el.contains(focused)) {
          focused.blur();
        }
      }
    });
    observer.observe(document.body, {
      attributes: true,
      subtree: true,
      attributeFilter: ["aria-hidden"],
    });
    return () => observer.disconnect();
  }, []);

  return (
    <ErrorBoundary>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthGuard>
          <StoreProvider>
            <Suspense fallback={null}>
              <CommandPalette />
            </Suspense>

            <SidebarProvider defaultOpen={false}>
              <AppSidebar onOpenSearch={() => setSearchOpen(true)} />
              <SidebarInset className="!min-h-0 h-svh overflow-hidden">
                <ThreeColumnLayout
                  leftWidth={280}
                  left={<PagesPanel />}
                  className="h-full"
                  center={
                    <>
                      <div className="md:hidden flex items-center gap-2 border-b border-border px-3 h-12 bg-card/95 backdrop-blur z-10 shrink-0">
                        <SidebarTrigger className="size-8" />
                        <button
                          type="button"
                          onClick={() => setSearchOpen(true)}
                          className="flex-1 text-left text-sm text-muted-foreground rounded-md border border-border px-3 py-1"
                        >
                          Search…
                        </button>
                      </div>
                      <div
                        className="flex-1 min-h-0 min-w-0 overflow-hidden"
                        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
                      >
                        <ErrorBoundary>
                          <Suspense fallback={<PageBodySkeleton />}>{children}</Suspense>
                        </ErrorBoundary>
                      </div>
                      <div className="md:hidden h-14 shrink-0" aria-hidden="true" />
                    </>
                  }
                />
              </SidebarInset>

              <SearchModal open={searchOpen} onOpenChange={setSearchOpen} />
              <MobileBottomNav onOpenSearch={() => setSearchOpen(true)} />
            </SidebarProvider>
          </StoreProvider>
        </AuthGuard>
      </TooltipProvider>
    </ErrorBoundary>
  );
}
