"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Switch } from "@/shared/ui/switch";
import { Badge } from "@/shared/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { TemplateEditor } from "./TemplateEditor";
import { TemplatePreviewDialog } from "./TemplatePreviewDialog";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { DynamicIcon } from "@/slices/icon-picker";
import { templateStats } from "../lib/previewTemplate";
import {
  Eye,
  Pencil,
  MoreHorizontal,
  Copy,
  Trash2,
  Search,
  FileText,
  Database,
  Boxes,
  Sparkles,
} from "lucide-react";

type Template = Doc<"pageTemplates">;
type Status = "all" | "published" | "draft" | "seed";

export function TemplatesPanel() {
  const list = useQuery(api.templates.queries.listAll);
  const seedDefaults = useMutation(api.templates.mutations.seedDefaults);
  const upsert = useMutation(api.templates.mutations.upsertTemplate);
  const deleteTpl = useMutation(api.templates.mutations.deleteTemplate);

  const [editing, setEditing] = useState<Id<"pageTemplates"> | "new" | null>(null);
  const [previewId, setPreviewId] = useState<Id<"pageTemplates"> | null>(null);
  const [seeding, setSeeding] = useState(false);
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

  const grouped = useMemo(() => {
    const map = new Map<string, Template[]>();
    for (const t of filtered) {
      const arr = map.get(t.category) ?? [];
      arr.push(t);
      map.set(t.category, arr);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

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

  if (list === undefined) {
    return <div className="text-sm text-muted-foreground">Loading…</div>;
  }

  if (editing) {
    return (
      <TemplateEditor
        templateId={editing === "new" ? null : editing}
        onClose={() => setEditing(null)}
      />
    );
  }

  async function togglePublish(t: Template) {
    await upsert({
      id: t._id,
      name: t.name,
      icon: t.icon,
      category: t.category,
      description: t.description ?? undefined,
      json: t.json,
      isPublished: !t.isPublished,
    });
  }

  async function duplicate(t: Template) {
    await upsert({
      name: `${t.name} (copy)`,
      icon: t.icon,
      category: t.category,
      description: t.description ?? undefined,
      json: t.json,
      isPublished: false,
    });
  }

  async function remove(t: Template) {
    if (!confirm(`Delete template "${t.name}"?`)) return;
    await deleteTpl({ id: t._id });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => setEditing("new")}>
          <Sparkles className="mr-1.5 h-3.5 w-3.5" /> New template
        </Button>
        <Button
          variant="outline"
          disabled={seeding}
          onClick={async () => {
            setSeeding(true);
            try {
              const r = await seedDefaults({});
              alert(`Seeded · inserted ${r.inserted}, updated ${r.updated}`);
            } catch (e) {
              alert((e as Error).message);
            } finally {
              setSeeding(false);
            }
          }}
        >
          Re-seed defaults
        </Button>
        <div className="ml-auto text-xs text-muted-foreground">
          {counts.total} total · {counts.published} published · {counts.draft} draft · {counts.seed} seed
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates…"
            className="pl-8 h-9"
          />
        </div>
        <StatusPills value={status} onChange={setStatus} counts={counts} />
        {categories.length > 1 && (
          <CategoryChips value={category} onChange={setCategory} categories={categories} />
        )}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-lg border border-dashed border-border bg-card px-4 py-10 text-sm text-muted-foreground text-center">
          {list.length === 0
            ? "No templates yet — click \"Re-seed defaults\" to install starter set."
            : "No templates match the current filters."}
        </div>
      )}

      {grouped.map(([cat, items]) => (
        <section key={cat} className="space-y-2">
          <div className="flex items-baseline gap-2">
            <h3 className="text-sm font-semibold">{cat}</h3>
            <span className="text-xs text-muted-foreground">{items.length}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((tpl) => (
              <TemplateCard
                key={String(tpl._id)}
                tpl={tpl}
                onPreview={() => setPreviewId(tpl._id)}
                onEdit={() => setEditing(tpl._id)}
                onTogglePublish={() => togglePublish(tpl)}
                onDuplicate={() => duplicate(tpl)}
                onDelete={() => remove(tpl)}
              />
            ))}
          </div>
        </section>
      ))}

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
    </div>
  );
}

function StatusPills({
  value,
  onChange,
  counts,
}: {
  value: Status;
  onChange: (s: Status) => void;
  counts: { total: number; published: number; draft: number; seed: number };
}) {
  const pills: { key: Status; label: string; count: number }[] = [
    { key: "all", label: "All", count: counts.total },
    { key: "published", label: "Published", count: counts.published },
    { key: "draft", label: "Draft", count: counts.draft },
    { key: "seed", label: "Seed", count: counts.seed },
  ];
  return (
    <div className="flex items-center gap-1 rounded-md border border-border bg-card p-0.5">
      {pills.map((p) => (
        <button
          key={p.key}
          type="button"
          onClick={() => onChange(p.key)}
          className={`px-2.5 py-1 text-xs rounded transition ${
            value === p.key
              ? "bg-accent text-accent-foreground font-medium"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {p.label} <span className="opacity-60">({p.count})</span>
        </button>
      ))}
    </div>
  );
}

function CategoryChips({
  value,
  onChange,
  categories,
}: {
  value: string;
  onChange: (c: string) => void;
  categories: string[];
}) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      <button
        type="button"
        onClick={() => onChange("all")}
        className={`px-2 py-1 text-xs rounded-full border transition ${
          value === "all"
            ? "border-foreground/40 bg-accent"
            : "border-border text-muted-foreground hover:text-foreground"
        }`}
      >
        All categories
      </button>
      {categories.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={`px-2 py-1 text-xs rounded-full border transition ${
            value === c
              ? "border-foreground/40 bg-accent"
              : "border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          {c}
        </button>
      ))}
    </div>
  );
}

function TemplateCard({
  tpl,
  onPreview,
  onEdit,
  onTogglePublish,
  onDuplicate,
  onDelete,
}: {
  tpl: Template;
  onPreview: () => void;
  onEdit: () => void;
  onTogglePublish: () => void | Promise<void>;
  onDuplicate: () => void | Promise<void>;
  onDelete: () => void | Promise<void>;
}) {
  const stats = useMemo(() => templateStats(tpl.json), [tpl.json]);
  return (
    <div className="group rounded-lg border border-border bg-card p-3 flex flex-col gap-2.5 hover:border-foreground/20 transition">
      <button
        type="button"
        onClick={onPreview}
        className="flex items-start gap-2.5 text-left"
        title="Preview"
      >
        <DynamicIcon value={tpl.icon} className="text-3xl shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-medium truncate">{tpl.name}</span>
            {tpl.isSeed && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">seed</Badge>}
            {!tpl.isPublished && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 border-amber-500/50 text-amber-700 dark:text-amber-400"
              >
                draft
              </Badge>
            )}
          </div>
          {tpl.description && (
            <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{tpl.description}</div>
          )}
        </div>
      </button>

      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1" title="Pages">
          <FileText className="h-3 w-3" /> {stats.pages}
        </span>
        <span className="inline-flex items-center gap-1" title="Blocks">
          <Boxes className="h-3 w-3" /> {stats.blocks}
        </span>
        <span className="inline-flex items-center gap-1" title="Databases">
          <Database className="h-3 w-3" /> {stats.databases}
        </span>
      </div>

      <div className="flex items-center gap-1.5 pt-1 border-t border-border/60">
        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={onPreview}>
          <Eye className="h-3.5 w-3.5 mr-1" /> Preview
        </Button>
        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
        </Button>
        <div className="ml-auto flex items-center gap-1.5" title={tpl.isPublished ? "Published" : "Draft"}>
          <Switch
            checked={tpl.isPublished}
            onCheckedChange={() => void onTogglePublish()}
            aria-label="Toggle publish"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => void onDuplicate()}>
              <Copy className="h-3.5 w-3.5 mr-2" /> Duplicate
            </DropdownMenuItem>
            {!tpl.isSeed && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => void onDelete()}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
