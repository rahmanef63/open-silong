"use client";

import { useState, type ReactNode } from "react";
import { Folder, Database as DbIcon, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useStore } from "@/shared/lib/store";
import { useAsyncError } from "@/shared/hooks/useAsyncError";
import { Checkbox } from "@/shared/ui/checkbox";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { DynamicIcon, IconPickerPopover } from "@/slices/icon-picker";
import { formatRelTime } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import type { Database } from "@/shared/types/domain";

interface Props {
  databases: Database[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (ids: string[], on: boolean) => void;
  onOpen: (id: string) => void;
  ownerLabel: string;
  emptyHint: ReactNode;
}

const relTime = (ts: number | null | undefined) => (ts ? formatRelTime(ts) : "—");

export function DatabasesTable({
  databases, selected, onToggle, onToggleAll, onOpen, ownerLabel, emptyHint,
}: Props) {
  const ids = databases.map((d) => d.id);
  const allSelected = ids.length > 0 && ids.every((id) => selected.has(id));
  const someSelected = ids.some((id) => selected.has(id));

  if (databases.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card px-4 py-12 text-center text-xs text-muted-foreground">
        {emptyHint}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="text-xs text-muted-foreground bg-muted/30">
          <tr>
            <th className="px-3 py-2 text-left w-8">
              <Checkbox
                checked={allSelected ? true : someSelected ? "indeterminate" : false}
                onCheckedChange={(v) => onToggleAll(ids, !!v)}
                aria-label="Select all databases"
              />
            </th>
            <th className="px-2 py-2 text-left font-normal">Name</th>
            <th className="hidden md:table-cell px-2 py-2 text-left font-normal">Created by</th>
            <th className="hidden lg:table-cell px-2 py-2 text-left font-normal">Source</th>
            <th className="hidden md:table-cell px-2 py-2 text-left font-normal">Rows</th>
            <th className="hidden md:table-cell px-2 py-2 text-left font-normal">Last edited</th>
            <th className="px-2 py-2 text-right font-normal w-10" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {databases.map((d) => {
            const isSelected = selected.has(d.id);
            return (
              <DatabaseRow
                key={d.id}
                db={d}
                isSelected={isSelected}
                onToggle={() => onToggle(d.id)}
                onOpen={() => onOpen(d.id)}
                ownerLabel={ownerLabel}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DatabaseRow({
  db, isSelected, onToggle, onOpen, ownerLabel,
}: {
  db: Database;
  isSelected: boolean;
  onToggle: () => void;
  onOpen: () => void;
  ownerLabel: string;
}) {
  const { updateDatabase, trashDatabase } = useStore();
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(db.name);
  const renameOp = useAsyncError(`library.dbRename.${db.id}`);
  const deleteOp = useAsyncError(`library.dbDelete.${db.id}`);

  function commitRename() {
    const next = draft.trim();
    setRenaming(false);
    if (!next || next === db.name) return;
    void renameOp.execute(async () => { updateDatabase(db.id, { name: next }); });
  }

  function setIcon(icon: string) {
    if (icon === db.icon) return;
    void renameOp.execute(async () => { updateDatabase(db.id, { icon }); });
  }

  function onDelete() {
    if (!window.confirm(`Move "${db.name || "Untitled database"}" to trash?`)) return;
    void deleteOp.execute(async () => { trashDatabase(db.id); });
  }

  return (
    <tr
      data-selected={isSelected || undefined}
      className={cn("group/row transition hover:bg-accent/40", isSelected && "bg-brand/10")}
    >
      <td className="px-3 py-1.5">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggle}
          aria-label={`Select ${db.name || "Untitled database"}`}
        />
      </td>
      <td className="px-2 py-1.5">
        <div className="flex items-center gap-2">
          <IconPickerPopover value={db.icon} onChange={setIcon}>
            <button
              type="button"
              className="text-base shrink-0 hover:bg-accent rounded p-0.5 transition"
              aria-label="Change icon"
              onClick={(e) => e.stopPropagation()}
            >
              <DynamicIcon value={db.icon} className="text-base" />
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
                if (e.key === "Escape") { setRenaming(false); setDraft(db.name); }
              }}
              className="h-7 text-sm"
            />
          ) : (
            <button
              type="button"
              onClick={onOpen}
              onDoubleClick={() => { setDraft(db.name); setRenaming(true); }}
              className="flex-1 truncate text-left font-medium"
            >
              {db.name || "Untitled database"}
            </button>
          )}
        </div>
      </td>
      <td className="hidden md:table-cell px-2 py-1.5 text-xs text-muted-foreground truncate max-w-[160px]">
        {ownerLabel}
      </td>
      <td className="hidden lg:table-cell px-2 py-1.5 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Folder className="h-3 w-3 opacity-60" />
          Root
        </span>
      </td>
      <td className="hidden md:table-cell px-2 py-1.5 text-xs text-muted-foreground tabular-nums">
        <span className="inline-flex items-center gap-1.5">
          <DbIcon className="h-3 w-3 opacity-60" />
          {db.rowIds.length}
        </span>
      </td>
      <td className="hidden md:table-cell px-2 py-1.5 text-xs text-muted-foreground">
        {relTime(db.updatedAt)}
      </td>
      <td className="px-2 py-1.5 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 opacity-0 group-hover/row:opacity-100 transition"
              aria-label="Database actions"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => { setDraft(db.name); setRenaming(true); }}>
              <Pencil className="mr-2 h-3.5 w-3.5" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onOpen}>
              <DbIcon className="mr-2 h-3.5 w-3.5" /> Open
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={onDelete}
              disabled={deleteOp.pending}
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" /> Move to trash
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}
