"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Library, Search, Plus } from "lucide-react";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { useStore } from "@/shared/lib/store";
import { groupPagesForLibrary, type LibrarySectionKey } from "../lib/groupPages";
import { PagesTable } from "../components/PagesTable";
import { DatabasesTable } from "../components/DatabasesTable";
import { BulkActionBar } from "../components/BulkActionBar";
import { DbBulkActionBar } from "../components/DbBulkActionBar";

type TabKey = LibrarySectionKey | "databases";

const TAB_ORDER: TabKey[] = ["recents", "favorites", "shared", "private", "databases"];

const TAB_LABELS: Record<TabKey, string> = {
  recents: "Recents",
  favorites: "Favorites",
  shared: "Shared",
  private: "Private",
  databases: "Databases",
};

const EMPTY_HINT: Record<TabKey, string> = {
  recents: "Pages you visit will appear here.",
  favorites: "Star pages to keep them at hand.",
  shared: "Pages you publish via Share will appear here.",
  private: "Top-level private pages live here.",
  databases: "No databases yet — slash menu › Database to create one.",
};

export function LibraryView() {
  const router = useRouter();
  const { pages, databases, recents, workspace, user, createPage, isInitialLoading } = useStore();
  const [tab, setTab] = useState<TabKey>("recents");
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectedDbs, setSelectedDbs] = useState<Set<string>>(new Set());

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

  function toggleDb(id: string) {
    setSelectedDbs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleManyDbs(ids: string[], on: boolean) {
    setSelectedDbs((prev) => {
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

  function openPage(id: string) {
    router.push(`/dashboard/p/${id}`);
  }

  /** Databases live on their host page — find it; otherwise no-op. */
  function openDatabase(id: string) {
    const host = pages.find((p) => !p.trashed && p.databaseHostFor?.includes(id));
    if (host) router.push(`/dashboard/p/${host.id}`);
  }

  function openSource(kind: "page" | "database", id: string) {
    if (kind === "page") openPage(id);
    else openDatabase(id);
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
                recentIds={recents}
                selected={selected}
                onToggle={toggle}
                onToggleAll={toggleMany}
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
              selected={selectedDbs}
              onToggle={toggleDb}
              onToggleAll={toggleManyDbs}
              onOpen={openDatabase}
              ownerLabel={ownerLabel}
              emptyHint={EMPTY_HINT.databases}
            />
          </TabsContent>
        </Tabs>
      </div>

      {tab !== "databases" && (
        <BulkActionBar selectedIds={[...selected]} onClear={() => setSelected(new Set())} />
      )}
      {tab === "databases" && (
        <DbBulkActionBar selectedIds={[...selectedDbs]} onClear={() => setSelectedDbs(new Set())} />
      )}
    </div>
  );
}
