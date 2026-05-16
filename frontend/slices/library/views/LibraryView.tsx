"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { useStore } from "@/shared/lib/store";
import { ROUTES_ABS } from "@/shared/lib/routes";
import { groupPagesForLibrary } from "../lib/groupPages";
import { PagesTable } from "../components/PagesTable";
import { DatabasesTable } from "../components/DatabasesTable";
import { BulkActionBar } from "../components/BulkActionBar";
import { DbBulkActionBar } from "../components/DbBulkActionBar";
import { TAB_ORDER, TAB_LABELS, EMPTY_HINT, type TabKey } from "./library/types";
import { useSelectionSet } from "./library/useSelection";
import { LibraryHeader } from "./library/Header";

export function LibraryView() {
  const router = useRouter();
  const { pages, databases, recents, workspace, user, createPage, isInitialLoading } = useStore();
  const [tab, setTab] = useState<TabKey>("recents");
  const [filter, setFilter] = useState("");
  const pageSel = useSelectionSet();
  const dbSel = useSelectionSet();

  const sections = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const filtered = q
      ? pages.filter((p) => (p.title ?? "").toLowerCase().includes(q))
      : pages;
    return groupPagesForLibrary({ pages: filtered, recentIds: recents });
  }, [pages, recents, filter]);

  const filteredDatabases = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const list = q
      ? databases.filter((d) => (d.name ?? "").toLowerCase().includes(q))
      : databases;
    return [...list].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
  }, [databases, filter]);

  const sectionByKey = useMemo(() => new Map(sections.map((s) => [s.key, s])), [sections]);

  const counts: Record<TabKey, number> = {
    recents: sectionByKey.get("recents")?.pages.length ?? 0,
    favorites: sectionByKey.get("favorites")?.pages.length ?? 0,
    shared: sectionByKey.get("shared")?.pages.length ?? 0,
    private: sectionByKey.get("private")?.pages.length ?? 0,
    databases: filteredDatabases.length,
  };

  const totalShown = TAB_ORDER.reduce((acc, k) => acc + counts[k], 0);

  async function newPage() {
    const p = await createPage(null);
    router.push(ROUTES_ABS.page(p.id));
  }
  const openPage = (id: string) => router.push(ROUTES_ABS.page(id));
  const openDatabase = (id: string) => router.push(ROUTES_ABS.database(id));
  const openSource = (kind: "page" | "database", id: string) => {
    if (kind === "page") openPage(id);
    else openDatabase(id);
  };

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
        <LibraryHeader
          workspaceName={workspace.name}
          filter={filter}
          onFilterChange={setFilter}
          onNewPage={newPage}
        />

        <div className="text-xs text-muted-foreground">
          {totalShown} entries · {pageSel.selected.size} selected
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="space-y-3">
          <TabsList className="h-9 w-full justify-start gap-1 overflow-x-auto">
            {TAB_ORDER.map((k) => (
              <TabsTrigger key={k} value={k} className="gap-1.5">
                <span>{TAB_LABELS[k]}</span>
                <span className="rounded-full bg-muted/60 px-1.5 py-0 text-[10px] tabular-nums text-muted-foreground data-[state=active]:bg-background">
                  {counts[k]}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          {(["recents", "favorites", "shared", "private"] as const).map((k) => (
            <TabsContent key={k} value={k} className="pb-32">
              <PagesTable
                pages={sectionByKey.get(k)?.pages ?? []}
                allPages={pages}
                databases={databases}
                selected={pageSel.selected}
                onToggle={pageSel.toggle}
                onToggleAll={pageSel.toggleMany}
                onOpen={openPage}
                onOpenSource={openSource}
                ownerLabel={ownerLabel}
                emptyHint={EMPTY_HINT[k]}
              />
            </TabsContent>
          ))}

          <TabsContent value="databases" className="pb-32">
            <DatabasesTable
              databases={filteredDatabases}
              pages={pages}
              selected={dbSel.selected}
              onToggle={dbSel.toggle}
              onToggleAll={dbSel.toggleMany}
              onOpen={openDatabase}
              onOpenSource={openSource}
              ownerLabel={ownerLabel}
              emptyHint={EMPTY_HINT.databases}
            />
          </TabsContent>
        </Tabs>
      </div>

      {tab !== "databases" && (
        <BulkActionBar selectedIds={[...pageSel.selected]} onClear={() => pageSel.setSelected(new Set())} />
      )}
      {tab === "databases" && (
        <DbBulkActionBar selectedIds={[...dbSel.selected]} onClear={() => dbSel.setSelected(new Set())} />
      )}
    </div>
  );
}
