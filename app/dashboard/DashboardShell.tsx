"use client";

import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { useConvexAuth } from "convex/react";
import { Search } from "lucide-react";
import { ErrorBoundary } from "@/shared/components/ErrorBoundary";
import { RouteSkeleton, PageBodySkeleton } from "@/shared/components/RouteSkeleton";
import { TooltipProvider } from "@/shared/ui/tooltip";
import { Toaster } from "@/shared/ui/toaster";
import { Toaster as Sonner } from "@/shared/ui/sonner";
import { StoreProvider } from "@/shared/lib/store";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/shared/ui/sidebar";
import { AppSidebar } from "@/slices/workspace-sidebar";
import { SearchModal } from "@/slices/command-palette/components/SearchModal";
import { useThemePreset } from "@/slices/theme-presets";
import { MobileBottomNav } from "@/slices/mobile-nav";

const CommandPalette = lazy(() =>
  import("@/slices/command-palette").then((m) => ({ default: m.CommandPalette })),
);

function AuthGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  // proxy.ts is the primary redirect path; this effect covers client-side
  // auth-state changes (sign-out, token expiry) where the proxy already let
  // the request through.
  useEffect(() => {
    if (!isLoading && !isAuthenticated) window.location.replace("/auth");
  }, [isLoading, isAuthenticated]);
  if (isLoading || !isAuthenticated) return <RouteSkeleton />;
  return <>{children}</>;
}

const SIDEBAR_STYLE = { "--sidebar-width": "17rem" } as React.CSSProperties;

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

  // Radix focus-scope sets aria-hidden on direct body children siblings of
  // the open portal. Watching body's *direct* children (subtree:false) is
  // enough — full subtree fires on every nested aria-hidden mutation in the
  // tree, which is hot during dnd/editor work.
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
      subtree: false,
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

            <SidebarProvider defaultOpen style={SIDEBAR_STYLE}>
              <AppSidebar onOpenSearch={() => setSearchOpen(true)} />
              <SidebarInset className="h-svh overflow-hidden">
                <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-card/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-card/80 z-10">
                  <SidebarTrigger className="size-8 -ml-1" />
                  <button
                    type="button"
                    onClick={() => setSearchOpen(true)}
                    className="flex-1 flex items-center gap-2 text-sm text-muted-foreground rounded-md border border-border bg-background/40 px-3 py-1 hover:bg-accent hover:text-foreground transition-colors max-w-md"
                  >
                    <Search className="h-3.5 w-3.5" />
                    <span className="flex-1 text-left">Search…</span>
                    <kbd className="hidden sm:inline-flex text-[10px] tracking-wider text-muted-foreground border border-border rounded px-1.5 py-0.5">⌘K</kbd>
                  </button>
                </header>

                <div
                  className="flex-1 min-h-0 min-w-0 overflow-hidden"
                  style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
                >
                  <ErrorBoundary>
                    <Suspense fallback={<PageBodySkeleton />}>{children}</Suspense>
                  </ErrorBoundary>
                </div>

                <div className="md:hidden h-14 shrink-0" aria-hidden="true" />
              </SidebarInset>
            </SidebarProvider>

            {/* Overlays — outside SidebarProvider so they don't participate in
                the flex layout. SearchModal portals via Dialog; MobileBottomNav
                is fixed-positioned. */}
            <SearchModal open={searchOpen} onOpenChange={setSearchOpen} />
            <MobileBottomNav onOpenSearch={() => setSearchOpen(true)} />
          </StoreProvider>
        </AuthGuard>
      </TooltipProvider>
    </ErrorBoundary>
  );
}
