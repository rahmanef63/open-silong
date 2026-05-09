"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Library, Search, Plus } from "lucide-react";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { useStore } from "@/shared/lib/store";
import { groupPagesForLibrary } from "../lib/groupPages";
import { SectionTable } from "../components/SectionTable";
import { BulkActionBar } from "../components/BulkActionBar";

export function LibraryView() {
  const router = useRouter();
  const { pages, recents, workspace, user, createPage, isInitialLoading } = useStore();
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const sections = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const filtered = q
      ? pages.filter((p) => (p.title ?? "").toLowerCase().includes(q))
      : pages;
    return groupPagesForLibrary({ pages: filtered, recentIds: recents });
  }, [pages, recents, filter]);

  const totalShown = sections.reduce((acc, s) => acc + s.pages.length, 0);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleMany(ids: string[], on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  async function newPage() {
    const p = await createPage(null);
    router.push(`/dashboard/p/${p.id}`);
  }

  if (isInitialLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 md:px-8 py-8 space-y-4">
        <div className="h-10 w-72 rounded bg-muted/40 animate-pulse" />
        <div className="h-9 w-full rounded bg-muted/30 animate-pulse" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 rounded-lg border border-border bg-card animate-pulse" />
        ))}
      </div>
    );
  }

  const ownerLabel = user?.name || user?.email || "You";

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="mx-auto max-w-6xl px-4 md:px-8 py-8 space-y-4">
        <header className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="grid place-items-center h-9 w-9 rounded-md bg-brand/10 text-brand">
              <Library className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Library</h1>
              <p className="text-xs text-muted-foreground">
                Browse, select, and bulk-edit every page in {workspace.name}.
              </p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Filter by title…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="pl-7 h-9 w-56"
              />
            </div>
            <Button size="sm" onClick={newPage}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> New page
            </Button>
          </div>
        </header>

        <div className="text-xs text-muted-foreground">
          {totalShown} entries · {selected.size} selected
        </div>

        <div className="space-y-4 pb-32">
          {sections.map((s) => (
            <SectionTable
              key={s.key}
              label={s.label}
              pages={s.pages}
              allPages={pages}
              workspaceName={workspace.name}
              recentIds={recents}
              selected={selected}
              onToggle={toggle}
              onToggleAll={toggleMany}
              onOpen={(id) => router.push(`/dashboard/p/${id}`)}
              ownerLabel={ownerLabel}
              defaultOpen={s.key !== "all" || filter.length > 0}
              emptyHint={
                s.key === "recents"
                  ? "Pages you visit will appear here."
                  : s.key === "favorites"
                    ? "Star pages to keep them at hand."
                    : s.key === "shared"
                      ? "Pages you publish via Share will appear here."
                      : s.key === "private"
                        ? "Top-level private pages live here."
                        : "No pages yet."
              }
            />
          ))}
        </div>
      </div>

      <BulkActionBar selectedIds={[...selected]} onClear={() => setSelected(new Set())} />
    </div>
  );
}
