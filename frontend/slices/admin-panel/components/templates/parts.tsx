"use client";

import { Button } from "@/shared/ui/button";
import { Switch } from "@/shared/ui/switch";
import { Skeleton } from "@/shared/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { Eye, Pencil, MoreHorizontal, Copy, Trash2, Sparkles, Inbox } from "lucide-react";
import type { Handlers, Template } from "./types";
import type { AdminView } from "../ViewSwitcher";

export function PublishToggle({
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
      <span className={tpl.isPublished ? "text-success" : "text-warning"}>
        {tpl.isPublished ? "Live" : "Draft"}
      </span>
      <Switch
        checked={tpl.isPublished}
        onCheckedChange={() => void onToggle(tpl)}
        aria-label="Toggle publish"
        className="data-[state=checked]:bg-success"
      />
    </label>
  );
}

export function RowActions({ tpl, handlers }: { tpl: Template; handlers: Handlers }) {
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

export function SkeletonView({ view }: { view: AdminView }) {
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

export function EmptyState({
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
