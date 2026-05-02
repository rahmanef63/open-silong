import { ReactNode, useEffect, useState } from "react";
import { WorkspaceSidebar } from "@/slices/workspace-sidebar/components/WorkspaceSidebar";
import { SearchModal } from "@/slices/command-palette/components/SearchModal";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/shared/ui/sidebar";
import { useThemePreset } from "@/slices/theme-presets";

export function AppShell({ children }: { children: ReactNode }) {
  useThemePreset();
  useEffect(() => {
    document.documentElement.classList.add("theme-transition");
  }, []);
  const [searchOpen, setSearchOpen] = useState(false);

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

  return (
    <SidebarProvider>
      <WorkspaceSidebar onOpenSearch={() => setSearchOpen(true)} />
      <SidebarInset className="bg-surface-elevated md:m-2 md:rounded-xl md:border md:border-border md:shadow-soft overflow-hidden">
        <div className="md:hidden flex items-center justify-between border-b border-border px-3 h-12">
          <SidebarTrigger className="-ml-2" />
          <button onClick={() => setSearchOpen(true)} className="text-sm text-muted-foreground rounded-md border border-border px-3 py-1">
            Search…
          </button>
        </div>
        <div className="flex-1 min-h-0">{children}</div>
      </SidebarInset>
      <SearchModal open={searchOpen} onOpenChange={setSearchOpen} />
    </SidebarProvider>
  );
}
