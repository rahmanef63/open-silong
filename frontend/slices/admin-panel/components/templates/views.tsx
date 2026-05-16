"use client";

import { useMemo } from "react";
import { Badge } from "@/shared/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { DynamicIcon } from "@/shared/components/icon-picker";
import { templateStats } from "@/slices/templates";
import { groupByDateBucket } from "../../lib/groupByDate";
import { formatRelTime } from "@/shared/lib/format";
import { FileText, Database, Boxes } from "lucide-react";
import { PublishToggle, RowActions } from "./parts";
import { TemplateCard } from "./TemplateCard";
import type { Handlers, Template } from "./types";

export function TemplateTableView({ items, handlers }: { items: Template[]; handlers: Handlers }) {
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

export function TemplateGalleryView({ items, handlers }: { items: Template[]; handlers: Handlers }) {
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

export function TemplateFeedView({ items, handlers }: { items: Template[]; handlers: Handlers }) {
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
