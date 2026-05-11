"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  ChevronRight, Folder, FileText, Database as DbIcon, MoreHorizontal,
  Pencil, Star, Trash2, ExternalLink,
} from "lucide-react";
import { useStore } from "@/shared/lib/store";
import { useAsyncError } from "@/shared/hooks/useAsyncError";
import { Checkbox } from "@/shared/ui/checkbox";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { DynamicIcon, IconPickerPopover } from "@/shared/components/icon-picker";
import { cn } from "@/shared/lib/utils";
import { formatRelTime } from "@/shared/lib/format";
import type { Database, Page } from "@/shared/types/domain";
import { pageSource } from "../lib/groupPages";

interface Props {
  pages: Page[];
  allPages: Page[];
  databases: Database[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (ids: string[], on: boolean) => void;
  onOpen: (id: string) => void;
  onOpenSource?: (kind: "page" | "database", id: string) => void;
  ownerLabel: string;
  emptyHint: ReactNode;
}

const relTime = (ts: number | null | undefined) => (ts ? formatRelTime(ts) : "—");

export function PagesTable({
  pages, allPages, databases, selected, onToggle, onToggleAll, onOpen,
  onOpenSource, ownerLabel, emptyHint,
}: Props) {
  // Children lookup over the entire workspace, not just `pages`, so a tab's
  // top-level rows (e.g. Favorites) can still expand into their full subtree.
  const childrenByParent = useMemo(() => {
    const map = new Map<string, Page[]>();
    for (const p of allPages) {
      if (p.trashed || p.rowOfDatabaseId || !p.parentId) continue;
      const arr = map.get(p.parentId) ?? [];
      arr.push(p);
      map.set(p.parentId, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
    }
    return map;
  }, [allPages]);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const ids = pages.map((p) => p.id);
  const allSelected = ids.length > 0 && ids.every((id) => selected.has(id));
  const someSelected = ids.some((id) => selected.has(id));

  if (pages.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card px-4 py-12 text-center text-xs text-muted-foreground">
        {emptyHint}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <table className="w-full text-sm table-fixed">
        <colgroup>
          <col className="w-10" />
          <col />
          <col className="w-[160px]" />
          <col className="w-[220px]" />
          <col className="w-[140px]" />
          <col className="w-12" />
        </colgroup>
        <thead className="text-xs text-muted-foreground bg-muted/30">
          <tr>
            <th className="px-3 py-2 text-left">
              <Checkbox
                checked={allSelected ? true : someSelected ? "indeterminate" : false}
                onCheckedChange={(v) => onToggleAll(ids, !!v)}
                aria-label="Select all"
              />
            </th>
            <th className="px-2 py-2 text-left font-normal">Name</th>
            <th className="hidden md:table-cell px-2 py-2 text-left font-normal">Created by</th>
            <th className="hidden lg:table-cell px-2 py-2 text-left font-normal">Source</th>
            <th className="hidden md:table-cell px-2 py-2 text-left font-normal">Last edited</th>
            <th className="px-2 py-2 text-right font-normal" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {pages.map((p) => (
            <PageRowGroup
              key={p.id}
              page={p}
              depth={0}
              allPages={allPages}
              databases={databases}
              childrenByParent={childrenByParent}
              expanded={expanded}
              onToggleExpand={toggleExpand}
              selected={selected}
              onToggle={onToggle}
              onOpen={onOpen}
              onOpenSource={onOpenSource}
              ownerLabel={ownerLabel}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PageRowGroup({
  page, depth, allPages, databases, childrenByParent, expanded, onToggleExpand,
  selected, onToggle, onOpen, onOpenSource, ownerLabel,
}: {
  page: Page;
  depth: number;
  allPages: Page[];
  databases: Database[];
  childrenByParent: Map<string, Page[]>;
  expanded: Set<string>;
  onToggleExpand: (id: string) => void;
  selected: Set<string>;
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
  onOpenSource?: (kind: "page" | "database", id: string) => void;
  ownerLabel: string;
}) {
  const children = childrenByParent.get(page.id) ?? [];
  const hasChildren = children.length > 0;
  const isOpen = expanded.has(page.id);

  return (
    <>
      <PageRow
        page={page}
        depth={depth}
        hasChildren={hasChildren}
        childCount={children.length}
        isExpanded={isOpen}
        onToggleExpand={() => onToggleExpand(page.id)}
        isSelected={selected.has(page.id)}
        onToggleSelect={() => onToggle(page.id)}
        source={pageSource(page, allPages, databases)}
        onOpen={() => onOpen(page.id)}
        onOpenSource={onOpenSource}
        ownerLabel={ownerLabel}
      />
      {hasChildren && isOpen && children.map((c) => (
        <PageRowGroup
          key={c.id}
          page={c}
          depth={depth + 1}
          allPages={allPages}
          databases={databases}
          childrenByParent={childrenByParent}
          expanded={expanded}
          onToggleExpand={onToggleExpand}
          selected={selected}
          onToggle={onToggle}
          onOpen={onOpen}
          onOpenSource={onOpenSource}
          ownerLabel={ownerLabel}
        />
      ))}
    </>
  );
}

function PageRow({
  page, depth, hasChildren, childCount, isExpanded, onToggleExpand,
  isSelected, onToggleSelect, source, onOpen, onOpenSource, ownerLabel,
}: {
  page: Page;
  depth: number;
  hasChildren: boolean;
  childCount: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isSelected: boolean;
  onToggleSelect: () => void;
  source: ReturnType<typeof pageSource>;
  onOpen: () => void;
  onOpenSource?: (kind: "page" | "database", id: string) => void;
  ownerLabel: string;
}) {
  const { updatePage, toggleFavorite, deletePage } = useStore();
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(page.title);
  const renameOp = useAsyncError(`library.pageRename.${page.id}`);
  const trashOp = useAsyncError(`library.pageTrash.${page.id}`);

  function commitRename() {
    const next = draft.trim();
    setRenaming(false);
    if (next === page.title) return;
    void renameOp.execute(async () => { updatePage(page.id, { title: next }); });
  }

  function setIcon(icon: string) {
    if (icon === page.icon) return;
    void renameOp.execute(async () => { updatePage(page.id, { icon }); });
  }

  function onTrash() {
    if (!window.confirm(`Move "${page.title || "Untitled"}" to trash?`)) return;
    void trashOp.execute(async () => { deletePage(page.id); });
  }

  return (
    <tr
      data-selected={isSelected || undefined}
      className={cn("group/row transition hover:bg-accent/40", isSelected && "bg-brand/10")}
    >
      <td className="px-3 py-1.5 align-middle">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggleSelect}
          aria-label={`Select ${page.title || "Untitled"}`}
        />
      </td>
      <td className="px-2 py-1.5 align-middle">
        <div
          className="flex items-center gap-1 min-w-0"
          style={{ paddingLeft: depth * 16 }}
        >
          <button
            type="button"
            onClick={onToggleExpand}
            disabled={!hasChildren}
            aria-label={hasChildren ? (isExpanded ? "Collapse" : "Expand") : undefined}
            className={cn(
              "h-5 w-5 grid place-items-center rounded shrink-0 transition",
              hasChildren ? "hover:bg-accent text-muted-foreground" : "opacity-0 pointer-events-none",
            )}
          >
            <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", isExpanded && "rotate-90")} />
          </button>
          <IconPickerPopover value={page.icon} onChange={setIcon}>
            <button
              type="button"
              className="text-base shrink-0 hover:bg-accent rounded p-0.5 transition"
              aria-label="Change icon"
              onClick={(e) => e.stopPropagation()}
            >
              <DynamicIcon value={page.icon} className="text-base" />
            </button>
          </IconPickerPopover>
          {renaming ? (
            <Input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") { setRenaming(false); setDraft(page.title); }
              }}
              className="h-7 text-sm flex-1 min-w-0"
            />
          ) : (
            <button
              type="button"
              onClick={onOpen}
              onDoubleClick={() => { setDraft(page.title); setRenaming(true); }}
              className="flex-1 min-w-0 truncate text-left font-medium"
            >
              <span className="truncate">{page.title || "Untitled"}</span>
              {hasChildren && (
                <span className="ml-2 text-[10px] text-muted-foreground tabular-nums">
                  {childCount} sub
                </span>
              )}
            </button>
          )}
          {page.favorite && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 shrink-0" />}
        </div>
      </td>
      <td className="hidden md:table-cell px-2 py-1.5 text-xs text-muted-foreground truncate align-middle">
        {ownerLabel}
      </td>
      <td className="hidden lg:table-cell px-2 py-1.5 text-xs text-muted-foreground truncate align-middle">
        <SourceCell source={source} onOpenSource={onOpenSource} />
      </td>
      <td className="hidden md:table-cell px-2 py-1.5 text-xs text-muted-foreground align-middle">
        {relTime(page.updatedAt)}
      </td>
      <td className="px-2 py-1.5 text-right align-middle">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 opacity-0 group-hover/row:opacity-100 transition data-[state=open]:opacity-100"
              aria-label="Page actions"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onOpen}>
              <ExternalLink className="mr-2 h-3.5 w-3.5" /> Open
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => { setDraft(page.title); setRenaming(true); }}>
              <Pencil className="mr-2 h-3.5 w-3.5" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => toggleFavorite(page.id)}>
              <Star className={cn("mr-2 h-3.5 w-3.5", page.favorite && "fill-yellow-400 text-yellow-400")} />
              {page.favorite ? "Unfavorite" : "Favorite"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={onTrash}
              disabled={trashOp.pending}
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" /> Move to trash
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}

function SourceCell({
  source,
  onOpenSource,
}: {
  source: ReturnType<typeof pageSource>;
  onOpenSource?: (kind: "page" | "database", id: string) => void;
}) {
  if (source.kind === "root") {
    return (
      <span className="inline-flex items-center gap-1.5">
        <Folder className="h-3 w-3 opacity-60" />
        <span>Root</span>
      </span>
    );
  }
  const Icon = source.kind === "database" ? DbIcon : FileText;
  const label = (
    <span className="inline-flex items-center gap-1.5 min-w-0">
      {source.icon ? (
        <DynamicIcon value={source.icon} className="text-xs" />
      ) : (
        <Icon className="h-3 w-3 opacity-60" />
      )}
      <span className="truncate">{source.label}</span>
    </span>
  );
  if (onOpenSource && source.targetId) {
    return (
      <button
        type="button"
        onClick={() => onOpenSource(source.kind === "database" ? "database" : "page", source.targetId!)}
        className="hover:text-foreground transition truncate max-w-full"
      >
        {label}
      </button>
    );
  }
  return label;
}
