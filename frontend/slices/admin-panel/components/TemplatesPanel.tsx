"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { TemplateEditor } from "./TemplateEditor";
import { TemplatePreviewDialog } from "./TemplatePreviewDialog";
import { ViewSwitcher, type AdminView } from "./ViewSwitcher";
import { useAdminView } from "../hooks/useAdminView";
import type { Id } from "@convex/_generated/dataModel";
import { Search, Sparkles, RefreshCw } from "lucide-react";
import { CountChip, StatusPills, CategoryChips } from "./templates/filters";
import { SkeletonView, EmptyState } from "./templates/parts";
import { TemplateTableView, TemplateGalleryView, TemplateFeedView } from "./templates/views";
import { DeleteDialog } from "./templates/DeleteDialog";
import { useTemplateMutations } from "./templates/useTemplateMutations";
import type { Handlers, Status, Template } from "./templates/types";

const AVAILABLE_VIEWS: AdminView[] = ["table", "gallery", "feed"];

export function TemplatesPanel() {
  const list = useQuery(api.templates.queries.listAll);
  const { togglePublish, duplicate, doDelete, reseed, seeding } = useTemplateMutations();

  const [view, setView] = useAdminView("templates", AVAILABLE_VIEWS);
  const [editing, setEditing] = useState<Id<"pageTemplates"> | "new" | null>(null);
  const [previewId, setPreviewId] = useState<Id<"pageTemplates"> | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Template | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<Status>("all");
  const [category, setCategory] = useState<string>("all");

  const categories = useMemo(() => {
    if (!list) return [] as string[];
    const set = new Set<string>();
    for (const t of list) set.add(t.category);
    return [...set].sort();
  }, [list]);

  const filtered = useMemo(() => {
    if (!list) return [] as Template[];
    const q = search.trim().toLowerCase();
    return list.filter((t) => {
      if (status === "published" && !t.isPublished) return false;
      if (status === "draft" && t.isPublished) return false;
      if (status === "seed" && !t.isSeed) return false;
      if (category !== "all" && t.category !== category) return false;
      if (q && !`${t.name} ${t.category} ${t.description ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [list, search, status, category]);

  const counts = useMemo(() => {
    if (!list) return { total: 0, published: 0, draft: 0, seed: 0 };
    let published = 0,
      draft = 0,
      seed = 0;
    for (const t of list) {
      if (t.isPublished) published += 1;
      else draft += 1;
      if (t.isSeed) seed += 1;
    }
    return { total: list.length, published, draft, seed };
  }, [list]);

  const previewTpl = useMemo(
    () => (previewId && list ? list.find((t) => t._id === previewId) ?? null : null),
    [previewId, list],
  );

  if (editing) {
    return (
      <TemplateEditor
        templateId={editing === "new" ? null : editing}
        onClose={() => setEditing(null)}
      />
    );
  }

  const handlers: Handlers = {
    onPreview: (t) => setPreviewId(t._id),
    onEdit: (t) => setEditing(t._id),
    onTogglePublish: togglePublish,
    onDuplicate: duplicate,
    onDelete: (t) => setConfirmDelete(t),
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => setEditing("new")}>
          <Sparkles className="mr-1.5 h-3.5 w-3.5" /> New template
        </Button>
        <Button variant="outline" disabled={seeding} onClick={reseed}>
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${seeding ? "animate-spin" : ""}`} />
          Re-seed defaults
        </Button>
        <div className="ml-auto flex items-center gap-1.5 text-xs">
          <CountChip label="Total" value={counts.total} />
          <CountChip label="Published" value={counts.published} tone="success" />
          <CountChip label="Draft" value={counts.draft} tone="warning" />
          <CountChip label="Seed" value={counts.seed} tone="muted" />
        </div>
      </div>

      <div className="sticky top-0 z-10 -mx-1 px-1 py-2 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70 border-b border-border/60">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, category, or description…"
              className="pl-8 h-9"
            />
          </div>
          <StatusPills value={status} onChange={setStatus} counts={counts} />
          {categories.length > 1 && (
            <CategoryChips value={category} onChange={setCategory} categories={categories} />
          )}
          <div className="ml-auto">
            <ViewSwitcher value={view} onChange={setView} available={AVAILABLE_VIEWS} />
          </div>
        </div>
      </div>

      {list === undefined && <SkeletonView view={view} />}

      {list && filtered.length === 0 && (
        <EmptyState
          empty={list.length === 0}
          onNew={() => setEditing("new")}
          onSeed={reseed}
          seeding={seeding}
        />
      )}

      {list && filtered.length > 0 && view === "table" && (
        <TemplateTableView items={filtered} handlers={handlers} />
      )}
      {list && filtered.length > 0 && view === "gallery" && (
        <TemplateGalleryView items={filtered} handlers={handlers} />
      )}
      {list && filtered.length > 0 && view === "feed" && (
        <TemplateFeedView items={filtered} handlers={handlers} />
      )}

      <TemplatePreviewDialog
        open={previewId !== null}
        onOpenChange={(o) => !o && setPreviewId(null)}
        template={
          previewTpl
            ? {
                _id: String(previewTpl._id),
                name: previewTpl.name,
                icon: previewTpl.icon,
                category: previewTpl.category,
                description: previewTpl.description,
                isPublished: previewTpl.isPublished,
                isSeed: previewTpl.isSeed,
                json: previewTpl.json,
              }
            : null
        }
        onEdit={() => {
          if (previewId) {
            setEditing(previewId);
            setPreviewId(null);
          }
        }}
      />

      <DeleteDialog target={confirmDelete} onClose={() => setConfirmDelete(null)} onConfirm={doDelete} />
    </div>
  );
}
