"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
} from "@/shared/ui/dialog";
import { useInstantiateTemplate } from "../hooks/useInstantiateTemplate";
import { useAsyncError } from "@/shared/hooks/useAsyncError";
import { ArrowLeft, Boxes, X } from "lucide-react";
import type { TemplateMeta } from "./gallery/parts";
import { Discover } from "./gallery/Discover";
import { PreviewPane } from "./gallery/PreviewPane";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentPageId?: string | null;
  onInstantiated?: (rootPageId: string) => void;
}

const ALL = "__all__";

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

  const selected = useMemo(
    () => list?.find((t) => String(t._id) === selectedId) ?? null,
    [list, selectedId],
  );
  const selectedJson = selectedFull?.json ?? null;
  const selectedLoading = selectedId !== null && selectedFull === undefined;

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
      onInstantiated?.(r.rootPageId);
    }
  };

  const inDetail = selected !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-0 max-w-7xl w-[96vw] h-[92vh] gap-0 flex flex-col overflow-hidden [&>button.absolute]:hidden"
      >
        <DialogTitle className="sr-only">Templates</DialogTitle>
        <DialogDescription className="sr-only">
          Pick a template to spin up a new page in this workspace.
        </DialogDescription>

        <header className="flex items-center gap-3 border-b border-border px-4 py-2.5 shrink-0">
          {inDetail ? (
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="h-8 px-2 flex items-center gap-1.5 rounded text-muted-foreground hover:bg-accent hover:text-foreground text-sm"
              aria-label="Back to gallery"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Templates</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Boxes className="h-4 w-4 text-brand shrink-0" />
              <span className="font-semibold text-sm">Templates</span>
              <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                · marketplace for new pages
              </span>
            </div>
          )}
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className="h-8 w-8 grid place-items-center rounded text-muted-foreground hover:bg-accent hover:text-foreground shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {inDetail ? (
          <PreviewPane
            selected={selected}
            selectedJson={selectedJson}
            selectedLoading={selectedLoading}
            pending={pending}
            onCancel={() => setSelectedId(null)}
            onUse={handleUse}
          />
        ) : (
          <Discover
            list={list}
            filtered={filtered}
            search={search}
            onSearchChange={setSearch}
            totalCount={list?.length ?? 0}
            categories={categories}
            activeCategory={activeCategory}
            onPickCategory={setActiveCategory}
            selectedId={selectedId}
            onSelect={(id) => setSelectedId(id)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
