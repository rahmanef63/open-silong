"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Switch } from "@/shared/ui/switch";
import { Badge } from "@/shared/ui/badge";
import { Skeleton } from "@/shared/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import {
  ResponsiveAlertDialog,
  ResponsiveAlertDialogContent,
  ResponsiveAlertDialogHeader,
  ResponsiveAlertDialogTitle,
  ResponsiveAlertDialogDescription,
  ResponsiveAlertDialogFooter,
  ResponsiveAlertDialogCancel,
  ResponsiveAlertDialogAction,
} from "@/shared/ui/responsive-alert-dialog";
import { TemplateEditor } from "./TemplateEditor";
import { TemplatePreviewDialog } from "./TemplatePreviewDialog";
import { ViewSwitcher, type AdminView } from "./ViewSwitcher";
import { useAdminView } from "../hooks/useAdminView";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { DynamicIcon } from "@/slices/icon-picker";
import { templateStats } from "../lib/previewTemplate";
import { groupByDateBucket } from "../lib/groupByDate";
import { formatRelTime } from "@/shared/lib/format";
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
  RefreshCw,
  Inbox,
} from "lucide-react";

type Template = Doc<"pageTemplates">;
type Status = "all" | "published" | "draft" | "seed";

const AVAILABLE_VIEWS: AdminView[] = ["table", "gallery", "feed"];

export function TemplatesPanel() {
  const list = useQuery(api.templates.queries.listAll);
  const seedDefaults = useMutation(api.templates.mutations.seedDefaults);
  const upsert = useMutation(api.templates.mutations.upsertTemplate);
  const deleteTpl = useMutation(api.templates.mutations.deleteTemplate);

  const [view, setView] = useAdminView("templates", AVAILABLE_VIEWS);
  const [editing, setEditing] = useState<Id<"pageTemplates"> | "new" | null>(null);
  const [previewId, setPreviewId] = useState<Id<"pageTemplates"> | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Template | null>(null);
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

  async function togglePublish(t: Template) {
    try {
      await upsert({
        id: t._id,
        name: t.name,
        icon: t.icon,
        category: t.category,
        description: t.description ?? undefined,
        json: t.json,
        isPublished: !t.isPublished,
      });
      toast.success(t.isPublished ? "Unpublished" : "Published");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function duplicate(t: Template) {
    try {
      await upsert({
        name: `${t.name} (copy)`,
        icon: t.icon,
        category: t.category,
        description: t.description ?? undefined,
        json: t.json,
        isPublished: false,
      });
      toast.success(`Duplicated "${t.name}"`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function doDelete(t: Template) {
    try {
      await deleteTpl({ id: t._id });
      toast.success(`Deleted "${t.name}"`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function reseed() {
    setSeeding(true);
    try {
      const r = await seedDefaults({});
      toast.success(`Seeded · ${r.inserted} new · ${r.updated} updated`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSeeding(false);
    }
  }

  const handlers = {
    onPreview: (t: Template) => setPreviewId(t._id),
    onEdit: (t: Template) => setEditing(t._id),
    onTogglePublish: togglePublish,
    onDuplicate: duplicate,
    onDelete: (t: Template) => setConfirmDelete(t),
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
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

      {/* Sticky filter bar + view switcher */}
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

      <ResponsiveAlertDialog open={confirmDelete !== null} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <ResponsiveAlertDialogContent>
          <ResponsiveAlertDialogHeader>
            <ResponsiveAlertDialogTitle>Delete template?</ResponsiveAlertDialogTitle>
            <ResponsiveAlertDialogDescription>
              "{confirmDelete?.name}" will be permanently removed. Existing pages already created from it stay intact.
            </ResponsiveAlertDialogDescription>
          </ResponsiveAlertDialogHeader>
          <ResponsiveAlertDialogFooter>
            <ResponsiveAlertDialogCancel>Cancel</ResponsiveAlertDialogCancel>
            <ResponsiveAlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (confirmDelete) await doDelete(confirmDelete);
                setConfirmDelete(null);
              }}
            >
              Delete
            </ResponsiveAlertDialogAction>
          </ResponsiveAlertDialogFooter>
        </ResponsiveAlertDialogContent>
      </ResponsiveAlertDialog>
    </div>
  );
}

interface Handlers {
  onPreview: (t: Template) => void;
  onEdit: (t: Template) => void;
  onTogglePublish: (t: Template) => void | Promise<void>;
  onDuplicate: (t: Template) => void | Promise<void>;
  onDelete: (t: Template) => void;
}

/* ---------- Views ---------- */

function TemplateTableView({ items, handlers }: { items: Template[]; handlers: Handlers }) {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8" />
            <TableHead>Name</TableHead>
            <TableHead className="hidden md:table-cell">Category</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden lg:table-cell text-right">Pages</TableHead>
            <TableHead className="hidden lg:table-cell text-right">Blocks</TableHead>
            <TableHead className="hidden lg:table-cell text-right">DBs</TableHead>
            <TableHead className="hidden md:table-cell">Updated</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((tpl) => {
            const stats = templateStats(tpl.json);
            return (
              <TableRow
                key={String(tpl._id)}
                className="cursor-pointer"
                onClick={() => handlers.onPreview(tpl)}
              >
                <TableCell>
                  <DynamicIcon value={tpl.icon} className="text-xl" />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-medium truncate max-w-[260px]">{tpl.name}</span>
                    {tpl.isSeed && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">seed</Badge>
                    )}
                  </div>
                  {tpl.description && (
                    <div className="text-xs text-muted-foreground line-clamp-1 max-w-[360px]">
                      {tpl.description}
                    </div>
                  )}
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{tpl.category}</TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <PublishToggle tpl={tpl} onToggle={handlers.onTogglePublish} />
                </TableCell>
                <TableCell className="hidden lg:table-cell text-right tabular-nums text-sm">{stats.pages}</TableCell>
                <TableCell className="hidden lg:table-cell text-right tabular-nums text-sm">{stats.blocks}</TableCell>
                <TableCell className="hidden lg:table-cell text-right tabular-nums text-sm">{stats.databases}</TableCell>
                <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                  {tpl.updatedAt ? formatRelTime(tpl.updatedAt) : "—"}
                </TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <RowActions tpl={tpl} handlers={handlers} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function TemplateGalleryView({ items, handlers }: { items: Template[]; handlers: Handlers }) {
  const grouped = useMemo(() => {
    const map = new Map<string, Template[]>();
    for (const t of items) {
      const arr = map.get(t.category) ?? [];
      arr.push(t);
      map.set(t.category, arr);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [items]);

  return (
    <div className="space-y-5">
      {grouped.map(([cat, group]) => (
        <section key={cat} className="space-y-3">
          <div className="flex items-baseline gap-2">
            <h3 className="text-sm font-semibold tracking-tight">{cat}</h3>
            <span className="text-xs text-muted-foreground">{group.length}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {group.map((tpl) => (
              <TemplateCard key={String(tpl._id)} tpl={tpl} handlers={handlers} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function TemplateFeedView({ items, handlers }: { items: Template[]; handlers: Handlers }) {
  const sorted = useMemo(
    () => [...items].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0)),
    [items],
  );
  const groups = useMemo(() => groupByDateBucket(sorted, (t) => t.updatedAt ?? t._creationTime), [sorted]);

  return (
    <div className="space-y-5">
      {groups.map(({ label, rows }) => (
        <section key={label} className="space-y-2">
          <div className="text-xs uppercase tracking-wide font-medium text-muted-foreground">{label}</div>
          <div className="rounded-lg border border-border bg-card divide-y divide-border">
            {rows.map((tpl) => {
              const stats = templateStats(tpl.json);
              return (
                <div
                  key={String(tpl._id)}
                  className="px-4 py-3 flex items-center gap-3 hover:bg-accent/30 transition cursor-pointer"
                  onClick={() => handlers.onPreview(tpl)}
                >
                  <DynamicIcon value={tpl.icon} className="text-2xl shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-medium truncate">{tpl.name}</span>
                      {tpl.isSeed && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">seed</Badge>}
                      {tpl.isPublished ? (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-emerald-500/50 text-emerald-700 dark:text-emerald-400 bg-emerald-500/5">live</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-amber-500/50 text-amber-700 dark:text-amber-400 bg-amber-500/5">draft</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {tpl.category}
                      {tpl.description ? ` · ${tpl.description}` : ""}
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><FileText className="h-3 w-3" />{stats.pages}</span>
                      <span className="inline-flex items-center gap-1"><Boxes className="h-3 w-3" />{stats.blocks}</span>
                      <span className="inline-flex items-center gap-1"><Database className="h-3 w-3" />{stats.databases}</span>
                      <span>· {tpl.updatedAt ? formatRelTime(tpl.updatedAt) : "—"}</span>
                    </div>
                  </div>
                  <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-1.5">
                    <PublishToggle tpl={tpl} onToggle={handlers.onTogglePublish} />
                    <RowActions tpl={tpl} handlers={handlers} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

/* ---------- Sub-components ---------- */

function PublishToggle({
  tpl,
  onToggle,
}: {
  tpl: Template;
  onToggle: (t: Template) => void | Promise<void>;
}) {
  return (
    <label
      className="flex items-center gap-1.5 text-[11px] text-muted-foreground select-none cursor-pointer"
      title={tpl.isPublished ? "Click to unpublish" : "Click to publish"}
      onClick={(e) => e.stopPropagation()}
    >
      <span className={tpl.isPublished ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>
        {tpl.isPublished ? "Live" : "Draft"}
      </span>
      <Switch
        checked={tpl.isPublished}
        onCheckedChange={() => void onToggle(tpl)}
        aria-label="Toggle publish"
        className="data-[state=checked]:bg-emerald-600"
      />
    </label>
  );
}

function RowActions({ tpl, handlers }: { tpl: Template; handlers: Handlers }) {
  return (
    <div className="inline-flex items-center gap-0.5">
      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handlers.onPreview(tpl)} title="Preview">
        <Eye className="h-3.5 w-3.5" />
      </Button>
      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handlers.onEdit(tpl)} title="Edit">
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => void handlers.onDuplicate(tpl)}>
            <Copy className="h-3.5 w-3.5 mr-2" /> Duplicate
          </DropdownMenuItem>
          {!tpl.isSeed && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => handlers.onDelete(tpl)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function TemplateCard({ tpl, handlers }: { tpl: Template; handlers: Handlers }) {
  const stats = useMemo(() => templateStats(tpl.json), [tpl.json]);
  return (
    <div className="group rounded-xl border border-border bg-card overflow-hidden hover:border-foreground/30 hover:shadow-sm transition flex flex-col">
      <button
        type="button"
        onClick={() => handlers.onPreview(tpl)}
        className="text-left p-4 flex items-start gap-3 hover:bg-accent/30 transition"
        title="Preview template"
      >
        <div className="shrink-0 h-11 w-11 rounded-lg border border-border bg-background flex items-center justify-center text-2xl">
          <DynamicIcon value={tpl.icon} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-medium truncate">{tpl.name}</span>
            {tpl.isSeed && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">seed</Badge>}
            {tpl.isPublished ? (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-emerald-500/50 text-emerald-700 dark:text-emerald-400 bg-emerald-500/5">live</Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-amber-500/50 text-amber-700 dark:text-amber-400 bg-amber-500/5">draft</Badge>
            )}
          </div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">{tpl.category}</div>
          {tpl.description && (
            <div className="mt-1.5 text-xs text-muted-foreground line-clamp-2">{tpl.description}</div>
          )}
        </div>
      </button>

      <div className="px-4 py-2 border-t border-border/60 bg-muted/20 flex items-center gap-3.5 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1" title="Pages">
          <FileText className="h-3 w-3" />
          <span className="tabular-nums">{stats.pages}</span>
        </span>
        <span className="inline-flex items-center gap-1" title="Blocks">
          <Boxes className="h-3 w-3" />
          <span className="tabular-nums">{stats.blocks}</span>
        </span>
        <span className="inline-flex items-center gap-1" title="Databases">
          <Database className="h-3 w-3" />
          <span className="tabular-nums">{stats.databases}</span>
        </span>
      </div>

      <div className="px-2 py-1.5 border-t border-border/60 flex items-center gap-0.5">
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => handlers.onPreview(tpl)}>
          <Eye className="h-3.5 w-3.5 mr-1" /> Preview
        </Button>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => handlers.onEdit(tpl)}>
          <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
        </Button>
        <div className="ml-auto flex items-center gap-1.5">
          <PublishToggle tpl={tpl} onToggle={handlers.onTogglePublish} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => void handlers.onDuplicate(tpl)}>
                <Copy className="h-3.5 w-3.5 mr-2" /> Duplicate
              </DropdownMenuItem>
              {!tpl.isSeed && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => handlers.onDelete(tpl)}
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
    </div>
  );
}

function SkeletonView({ view }: { view: AdminView }) {
  if (view === "table") {
    return (
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border/60">
          <Skeleton className="h-4 w-32" />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="px-4 py-3 flex items-center gap-3 border-b border-border/60 last:border-b-0">
            <Skeleton className="h-6 w-6" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-5 w-9 rounded-full" />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-start gap-3">
            <Skeleton className="h-9 w-9 rounded-md" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-2/3" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
          <Skeleton className="h-3 w-1/2" />
          <div className="flex items-center justify-between pt-1">
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-5 w-9 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  empty,
  onNew,
  onSeed,
  seeding,
}: {
  empty: boolean;
  onNew: () => void;
  onSeed: () => void;
  seeding: boolean;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
        <Inbox className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="text-sm font-medium">{empty ? "No templates yet" : "No matches"}</div>
      <div className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
        {empty
          ? "Install the starter set or create your first template from scratch."
          : "Adjust the search, status, or category filters."}
      </div>
      {empty && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button size="sm" onClick={onNew}>
            <Sparkles className="mr-1.5 h-3.5 w-3.5" /> New template
          </Button>
          <Button size="sm" variant="outline" onClick={onSeed} disabled={seeding}>
            Re-seed defaults
          </Button>
        </div>
      )}
    </div>
  );
}

function CountChip({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "success" | "warning" | "muted";
}) {
  const cls =
    tone === "success"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
      : tone === "warning"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
        : tone === "muted"
          ? "border-border bg-muted/40 text-muted-foreground"
          : "border-border bg-card text-foreground";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${cls}`}>
      <span className="font-semibold tabular-nums">{value}</span>
      <span className="opacity-80">{label}</span>
    </span>
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
    <div className="inline-flex items-center gap-0.5 rounded-md border border-border bg-card p-0.5">
      {pills.map((p) => (
        <button
          key={p.key}
          type="button"
          onClick={() => onChange(p.key)}
          className={`px-2.5 h-7 text-xs rounded transition ${
            value === p.key
              ? "bg-accent text-accent-foreground font-medium shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
          }`}
        >
          {p.label}
          <span className="ml-1 tabular-nums opacity-60">{p.count}</span>
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
      <ChipButton active={value === "all"} onClick={() => onChange("all")}>
        All categories
      </ChipButton>
      {categories.map((c) => (
        <ChipButton key={c} active={value === c} onClick={() => onChange(c)}>
          {c}
        </ChipButton>
      ))}
    </div>
  );
}

function ChipButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 h-7 text-xs rounded-full border transition ${
        active
          ? "border-foreground/40 bg-accent text-accent-foreground"
          : "border-border text-muted-foreground hover:text-foreground hover:bg-accent/50"
      }`}
    >
      {children}
    </button>
  );
}

