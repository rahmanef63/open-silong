"use client";

import { useMemo } from "react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { DynamicIcon } from "@/shared/components/icon-picker";
import { templateStats } from "@/slices/templates/lib/previewTemplate";
import { Eye, Pencil, MoreHorizontal, Copy, Trash2, FileText, Database, Boxes } from "lucide-react";
import { PublishToggle } from "./parts";
import type { Handlers, Template } from "./types";

export function TemplateCard({ tpl, handlers }: { tpl: Template; handlers: Handlers }) {
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
