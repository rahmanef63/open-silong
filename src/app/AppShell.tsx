import { ReactNode, useEffect, useState } from "react";
import { WorkspaceSidebar } from "@/slices/workspace-sidebar/components/WorkspaceSidebar";
import { SearchModal } from "@/slices/command-palette/components/SearchModal";
import { useSearchBackfill } from "@/slices/search";
import { Menu, X } from "lucide-react";
import { Sheet, SheetContent } from "@/shared/ui/sheet";
import { useStore } from "@/shared/lib/store";
import { cn } from "@/shared/lib/utils";

export function AppShell({ children }: { children: ReactNode }) {
  const { preferences, user } = useStore();
  useSearchBackfill(!!user?.id);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const compact = preferences.sidebarDensity === "compact";

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

  return (
    <div className="flex h-screen w-full bg-surface">
      {/* Desktop sidebar */}
      <div className={cn("hidden md:flex shrink-0", compact ? "w-56" : "w-64")}>
        <WorkspaceSidebar onOpenSearch={() => setSearchOpen(true)} />
      </div>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className={cn("p-0", compact ? "w-64" : "w-72")}>
          <WorkspaceSidebar onOpenSearch={() => { setSearchOpen(true); setMobileOpen(false); }} onClose={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <main className="flex-1 min-w-0 flex flex-col bg-surface-elevated md:m-2 md:rounded-xl md:border md:border-border md:shadow-soft overflow-hidden">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center justify-between border-b border-border px-3 h-12">
          <button onClick={() => setMobileOpen(true)} className="p-2 -ml-2 rounded hover:bg-accent">
            <Menu className="h-5 w-5" />
          </button>
          <button onClick={() => setSearchOpen(true)} className="text-sm text-muted-foreground rounded-md border border-border px-3 py-1">
            Search…
          </button>
        </div>
        <div className="flex-1 min-h-0">{children}</div>
      </main>

      <SearchModal open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
