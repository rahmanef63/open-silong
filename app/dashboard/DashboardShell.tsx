"use client";

import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { useConvexAuth } from "convex/react";
import { Search } from "lucide-react";
import { ErrorBoundary } from "@/shared/components/ErrorBoundary";
import { ConfirmProvider } from "@/shared/components/ConfirmProvider";
import { RouteSkeleton, PageBodySkeleton } from "@/shared/components/RouteSkeleton";
import { TooltipProvider } from "@/shared/ui/tooltip";
import { Toaster } from "@/shared/ui/toaster";
import { Toaster as Sonner } from "@/shared/ui/sonner";
import { StoreProvider } from "@/shared/lib/store";
import { NotionAdapterProvider } from "@/slices/notion";
import { useConvexNotionAdapter } from "@/slices/notion/adapter/convexAdapter";
import { RouterProvider } from "@/shared/lib/router";
import { WorkspaceIOProvider } from "@/slices/workspace-io";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/shared/ui/sidebar";
import { Separator } from "@/shared/ui/separator";
import { Button } from "@/shared/ui/button";
import {
  PageHeaderSlotProvider,
  PageHeaderLeftAnchor,
  PageHeaderRightAnchor,
} from "@/shared/components/PageHeaderSlot";
import { AppSidebar } from "@/slices/workspace-sidebar";
import { SearchModal } from "@/slices/command-palette/components/SearchModal";
import { SelectionToolbar } from "@/slices/editor/components/SelectionToolbar";
import { MentionTypeahead } from "@/slices/editor/components/MentionTypeahead";
import { useThemePreset } from "@/slices/theme-presets";
import { useTouchLastSeen } from "@/shared/hooks/useTouchLastSeen";
import { MobileBottomNav } from "@/slices/mobile-nav";

const CommandPalette = lazy(() =>
  import("@/slices/command-palette").then((m) => ({ default: m.CommandPalette })),
);
const ShortcutsDialog = lazy(() =>
  import("@/slices/command-palette").then((m) => ({ default: m.ShortcutsDialog })),
);

/** Mount the production NotionAdapter — must live inside StoreProvider
 *  because the Convex adapter wraps useStore() for pages + databases.
 *  Phase 1 mount: additive, no consumer yet. Editor refactor in Phase 2
 *  flips slice files from useStore() → useNotionAdapter() inside this
 *  provider's subtree. */
function NotionAdapterMount({ children }: { children: ReactNode }) {
  const adapter = useConvexNotionAdapter();
  return <NotionAdapterProvider adapter={adapter}>{children}</NotionAdapterProvider>;
}

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
  useTouchLastSeen();
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
          <RouterProvider basename="/dashboard">
          <StoreProvider>
            <NotionAdapterMount>
            <ConfirmProvider>
            <WorkspaceIOProvider>
            <Suspense fallback={null}>
              <CommandPalette />
            </Suspense>
            <Suspense fallback={null}>
              <ShortcutsDialog />
            </Suspense>
            <SelectionToolbar />
            <MentionTypeahead />

            <SidebarProvider defaultOpen style={SIDEBAR_STYLE}>
              <div className="print:hidden contents">
                <AppSidebar onOpenSearch={() => setSearchOpen(true)} />
              </div>
              {/* h-svh + overflow-hidden deviate from shadcn canonical:
                  PageEditor uses an internal-scroll model (`h-full overflow-hidden`
                  + inner `overflow-y-auto`), so SidebarInset needs a definite
                  viewport-bound height instead of free flow. */}
              <SidebarInset className="h-svh overflow-hidden">
                <PageHeaderSlotProvider>
                  <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-10 print:hidden">
                    <div className="flex w-full items-center gap-2 px-3">
                      <SidebarTrigger className="-ml-1" />
                      <Separator
                        orientation="vertical"
                        className="mr-1 data-[orientation=vertical]:h-4"
                      />
                      {/* Left slot: route-injected breadcrumb. Falls back to flex spacer. */}
                      <PageHeaderLeftAnchor className="flex min-w-0 flex-1 items-center gap-2" />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setSearchOpen(true)}
                        className="h-auto gap-2 text-sm font-normal text-muted-foreground bg-background/40 px-2 py-1 hover:text-foreground [&_svg]:size-3.5"
                        aria-label="Search"
                      >
                        <Search className="h-3.5 w-3.5" />
                        <span className="hidden md:inline">Search</span>
                        <kbd className="hidden sm:inline-flex text-[10px] tracking-wider text-muted-foreground border border-border rounded px-1.5 py-0.5">⌘K</kbd>
                      </Button>
                      {/* Right slot: route-injected actions (Share, history, …). */}
                      <PageHeaderRightAnchor className="flex items-center gap-1" />
                    </div>
                  </header>

                  <div
                    className="flex flex-1 flex-col min-h-0 overflow-hidden"
                    style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
                  >
                    <ErrorBoundary>
                      <Suspense fallback={<PageBodySkeleton />}>{children}</Suspense>
                    </ErrorBoundary>
                  </div>

                  <div className="md:hidden h-14 shrink-0" aria-hidden="true" />
                </PageHeaderSlotProvider>
              </SidebarInset>
            </SidebarProvider>

            {/* Overlays — outside SidebarProvider so they don't participate in
                the flex layout. SearchModal portals via Dialog; MobileBottomNav
                is fixed-positioned. */}
            <SearchModal open={searchOpen} onOpenChange={setSearchOpen} />
            <MobileBottomNav onOpenSearch={() => setSearchOpen(true)} />
            </WorkspaceIOProvider>
            </ConfirmProvider>
            </NotionAdapterMount>
          </StoreProvider>
          </RouterProvider>
        </AuthGuard>
      </TooltipProvider>
    </ErrorBoundary>
  );
}
