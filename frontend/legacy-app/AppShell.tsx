import { ReactNode, useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { WorkspaceSidebar } from "@/slices/workspace-sidebar/components/WorkspaceSidebar";
import { SearchModal } from "@/slices/command-palette/components/SearchModal";
import { SidebarProvider } from "@/shared/ui/sidebar";
import { Sheet, SheetContent } from "@/shared/ui/sheet";
import { ThreeColumnLayout } from "@/shared/ui/three-column-layout";
import { useThemePreset } from "@/slices/theme-presets";
import { MobileBottomNav } from "@/slices/mobile-nav";

export function AppShell({ children }: { children: ReactNode }) {
  useThemePreset();
  useEffect(() => {
    document.documentElement.classList.add("theme-transition");
  }, []);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(o => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Radix aria-hidden focus warning suppression — see git history for context.
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

  // SidebarProvider stays — provides useSidebar() context that WorkspaceSidebar
  // + WorkspaceSwitcher consume (state only; layout is now handled by
  // ThreeColumnLayout below).
  return (
    <SidebarProvider>
      <ThreeColumnLayout
        leftWidth={280}
        left={<WorkspaceSidebar onOpenSearch={() => setSearchOpen(true)} />}
        center={
          <>
            <div className="md:hidden flex items-center gap-2 border-b border-border px-3 h-12 bg-card/95 backdrop-blur sticky top-0 z-10">
              <button
                onClick={() => setMobileSidebarOpen(true)}
                aria-label="Open sidebar"
                className="grid place-items-center w-8 h-8 rounded-md hover:bg-accent"
              >
                <Menu className="h-4 w-4" />
              </button>
              <button
                onClick={() => setSearchOpen(true)}
                className="flex-1 text-left text-sm text-muted-foreground rounded-md border border-border px-3 py-1"
              >
                Search…
              </button>
            </div>
            <div
              className="flex-1 min-h-0 bg-surface-elevated md:m-2 md:rounded-xl md:border md:border-border md:shadow-soft min-w-0"
              style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
            >
              {children}
            </div>
            {/* Spacer above mobile bottom nav */}
            <div className="md:hidden h-14" aria-hidden="true" />
          </>
        }
      />
      {/* Mobile-only off-canvas sidebar (desktop uses left column) */}
      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetContent side="left" className="w-[280px] p-0 md:hidden bg-sidebar text-sidebar-foreground">
          <WorkspaceSidebar
            onOpenSearch={() => { setMobileSidebarOpen(false); setSearchOpen(true); }}
            onClose={() => setMobileSidebarOpen(false)}
          />
        </SheetContent>
      </Sheet>
      <SearchModal open={searchOpen} onOpenChange={setSearchOpen} />
      <MobileBottomNav onOpenSearch={() => setSearchOpen(true)} />
    </SidebarProvider>
  );
}
