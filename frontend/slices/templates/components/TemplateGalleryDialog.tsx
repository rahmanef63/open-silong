"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { useInstantiateTemplate } from "../hooks/useInstantiateTemplate";
import { useAsyncError } from "@/shared/hooks/useAsyncError";
import { DynamicIcon } from "@/shared/components/icon-picker";
import { TemplatePagePreview } from "./TemplatePagePreview";
import { templateStats } from "../lib/previewTemplate";
import {
  ArrowLeft, ChevronRight, FileText, Boxes, Rows3, Database, Search, X,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentPageId?: string | null;
  onInstantiated?: (rootPageId: string) => void;
}

const ALL = "__all__";

interface TemplateMeta {
  _id: string;
  name: string;
  icon: string;
  category: string;
  description?: string | null;
}

export function TemplateGalleryDialog({
  open,
  onOpenChange,
  parentPageId,
  onInstantiated,
}: Props) {
  const list = useQuery(api.templates.queries.listPublished) as TemplateMeta[] | undefined;
  const instantiate = useInstantiateTemplate();
  const inst = useAsyncError("templateGallery.instantiate");

  const [activeCategory, setActiveCategory] = useState<string>(ALL);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [pending, setPending] = useState(false);
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);

  // Fetch full template (with json) only when a card is selected.
  const selectedFull = useQuery(
    api.templates.queries.getOne,
    selectedId ? { id: selectedId as any } : "skip",
  );

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of list ?? []) {
      counts.set(t.category, (counts.get(t.category) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, count]) => ({ name, count }));
  }, [list]);

  const filtered = useMemo(() => {
    if (!list) return [];
    const q = search.trim().toLowerCase();
    return list.filter((t) => {
      if (activeCategory !== ALL && t.category !== activeCategory) return false;
      if (q && !t.name.toLowerCase().includes(q) && !(t.description ?? "").toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [list, activeCategory, search]);

  const selectedMeta = useMemo(
    () => list?.find((t) => String(t._id) === selectedId) ?? null,
    [list, selectedId],
  );
  const selected = selectedMeta;
  const selectedJson = selectedFull?.json ?? null;

  const handleUse = async () => {
    if (!selected || pending) return;
    setPending(true);
    const r = await inst.execute(async () =>
      instantiate(selected._id as any, parentPageId ?? null),
    );
    setPending(false);
    if (r) {
      onOpenChange(false);
      setSelectedId(null);
      setMobilePreviewOpen(false);
      onInstantiated?.(r.rootPageId);
    }
  };

  const totalCount = list?.length ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-0 max-w-6xl w-[96vw] h-[88vh] gap-0 flex flex-col overflow-hidden [&>button.absolute]:hidden"
      >
        <DialogTitle className="sr-only">Templates</DialogTitle>
        <DialogDescription className="sr-only">
          Pick a template to spin up a new page in this workspace.
        </DialogDescription>

        {/* Header */}
        <header className="flex items-center gap-3 border-b border-border px-4 py-2.5 shrink-0">
          {mobilePreviewOpen && (
            <button
              type="button"
              onClick={() => setMobilePreviewOpen(false)}
              className="md:hidden h-8 w-8 grid place-items-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="Back to list"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Boxes className="h-4 w-4 text-brand shrink-0" />
            <span className="font-semibold text-sm">Templates</span>
            <span className="text-xs text-muted-foreground truncate">
              · pick a starter for a new page
            </span>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className="h-8 w-8 grid place-items-center rounded text-muted-foreground hover:bg-accent hover:text-foreground shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
          {/* Sidebar: categories */}
          <aside
            className={cn(
              "shrink-0 border-b md:border-b-0 md:border-r border-border bg-muted/20",
              "md:w-56 md:flex-col md:flex md:overflow-y-auto md:scrollbar-thin",
              mobilePreviewOpen ? "hidden md:flex" : "flex flex-col",
            )}
          >
            <div className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Categories
            </div>
            <nav className="md:flex md:flex-col gap-0.5 px-2 pb-2 flex overflow-x-auto md:overflow-x-visible scrollbar-thin">
              <CategoryRow
                label="All"
                count={totalCount}
                active={activeCategory === ALL}
                onClick={() => setActiveCategory(ALL)}
              />
              {categories.map((c) => (
                <CategoryRow
                  key={c.name}
                  label={c.name}
                  count={c.count}
                  active={activeCategory === c.name}
                  onClick={() => setActiveCategory(c.name)}
                />
              ))}
            </nav>
          </aside>

          {/* Grid */}
          <section
            className={cn(
              "flex-1 min-h-0 flex flex-col overflow-hidden",
              mobilePreviewOpen ? "hidden md:flex" : "flex",
            )}
          >
            <div className="px-4 py-3 border-b border-border bg-card sticky top-0 z-10 shrink-0">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search templates…"
                  className="w-full bg-background border border-border rounded-md pl-7 pr-3 py-1.5 text-sm outline-none focus:border-brand"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3">
              {list === undefined && (
                <div className="text-sm text-muted-foreground text-center py-8">
                  Loading templates…
                </div>
              )}
              {list && filtered.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-8">
                  {search ? "No templates match your search." : "No templates in this category."}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {filtered.map((tpl) => (
                  <TemplateCard
                    key={String(tpl._id)}
                    tpl={tpl}
                    active={selectedId === String(tpl._id)}
                    onSelect={() => {
                      setSelectedId(String(tpl._id));
                      setMobilePreviewOpen(true);
                    }}
                  />
                ))}
              </div>
            </div>
          </section>

          {/* Preview pane */}
          <aside
            className={cn(
              "md:w-[420px] lg:w-[480px] shrink-0 border-t md:border-t-0 md:border-l border-border bg-card flex flex-col overflow-hidden",
              mobilePreviewOpen ? "flex flex-1 min-h-0" : "hidden md:flex",
            )}
          >
            {!selected ? (
              <div className="flex-1 grid place-items-center text-center p-6 text-muted-foreground">
                <div>
                  <Boxes className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <div className="text-sm font-medium">Select a template</div>
                  <div className="text-xs mt-1">Click a card to see its full preview.</div>
                </div>
              </div>
            ) : (
              <>
                <div className="px-4 py-3 border-b border-border shrink-0">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl shrink-0 leading-none mt-0.5">
                      <DynamicIcon value={selected.icon} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm truncate">{selected.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{selected.category}</div>
                    </div>
                  </div>
                  {selected.description && (
                    <div className="text-xs text-muted-foreground mt-2 line-clamp-2">
                      {selected.description}
                    </div>
                  )}
                  {selectedJson ? <StatsRow json={selectedJson} /> : null}
                </div>
                <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3">
                  {selectedJson === null && selectedFull === undefined ? (
                    <div className="text-sm text-muted-foreground text-center py-6">
                      Loading preview…
                    </div>
                  ) : selectedJson ? (
                    <TemplatePagePreview json={selectedJson} />
                  ) : (
                    <div className="text-sm text-muted-foreground text-center py-6">
                      Preview unavailable.
                    </div>
                  )}
                </div>
                <div className="px-4 py-3 border-t border-border bg-background shrink-0 flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedId(null);
                      setMobilePreviewOpen(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={handleUse}
                    disabled={pending}
                  >
                    {pending ? "Creating…" : (
                      <>
                        Use this template
                        <ChevronRight className="ml-1 h-3.5 w-3.5" />
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CategoryRow({
  label, count, active, onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-sm text-left transition-colors shrink-0 whitespace-nowrap",
        active
          ? "bg-brand/15 text-brand font-medium"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      <span className="truncate">{label}</span>
      <span
        className={cn(
          "text-[10px] tabular-nums rounded px-1.5 py-0.5 shrink-0",
          active ? "bg-brand/20 text-brand" : "bg-muted text-muted-foreground",
        )}
      >
        {count}
      </span>
    </button>
  );
}

function TemplateCard({
  tpl, active, onSelect,
}: {
  tpl: TemplateMeta;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        "flex flex-col items-start gap-2 rounded-lg border bg-card p-3 text-left transition-all",
        active
          ? "border-brand ring-2 ring-brand/30 shadow-sm"
          : "border-border hover:border-foreground/30 hover:shadow-sm",
      )}
    >
      <div className="flex items-start gap-2.5 w-full">
        <div className="text-2xl shrink-0 leading-none">
          <DynamicIcon value={tpl.icon} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium truncate">{tpl.name}</div>
          {tpl.description && (
            <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
              {tpl.description}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground/80 mt-auto">
        <span className="rounded-full bg-muted px-2 py-0.5 truncate max-w-[140px]">
          {tpl.category}
        </span>
      </div>
    </button>
  );
}

function StatsRow({ json }: { json: unknown }) {
  const stats = useMemo(() => templateStats(json), [json]);
  return (
    <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-2">
      <span className="flex items-center gap-1">
        <FileText className="h-3 w-3" /> {stats.pages} {stats.pages === 1 ? "page" : "pages"}
      </span>
      <span className="flex items-center gap-1">
        <Rows3 className="h-3 w-3" /> {stats.blocks} blocks
      </span>
      {stats.databases > 0 && (
        <span className="flex items-center gap-1">
          <Database className="h-3 w-3" /> {stats.databases} {stats.databases === 1 ? "DB" : "DBs"}
        </span>
      )}
    </div>
  );
}
