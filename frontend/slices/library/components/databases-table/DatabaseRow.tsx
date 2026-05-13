"use client";

import { useState } from "react";
import {
  Folder, FileText, MoreHorizontal, Pencil, Trash2, ExternalLink,
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
import { formatRelTime } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import type { Database, Page } from "@/shared/types/domain";

const relTime = (ts: number | null | undefined) => (ts ? formatRelTime(ts) : "—");

export function DatabaseRow({
  db, host, isSelected, onToggle, onOpen, onOpenSource, ownerLabel,
}: {
  db: Database;
  host: Page | null;
  isSelected: boolean;
  onToggle: () => void;
  onOpen: () => void;
  onOpenSource?: (kind: "page" | "database", id: string) => void;
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

  const rowCount = db.rowIds.length;

  return (
    <tr
      data-selected={isSelected || undefined}
      className={cn("group/row transition hover:bg-accent/40", isSelected && "bg-brand/10")}
    >
      <td className="px-3 py-1.5 align-middle">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggle}
          aria-label={`Select ${db.name || "Untitled database"}`}
        />
      </td>
      <td className="px-2 py-1.5 align-middle">
        <div className="flex items-center gap-1 min-w-0">
          <span className="h-5 w-5 shrink-0" aria-hidden />
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
              className="h-7 text-sm flex-1 min-w-0"
            />
          ) : (
            <button
              type="button"
              onClick={onOpen}
              onDoubleClick={() => { setDraft(db.name); setRenaming(true); }}
              className="flex-1 min-w-0 truncate text-left font-medium"
            >
              <span className="truncate">{db.name || "Untitled database"}</span>
              <span className="ml-2 text-[10px] text-muted-foreground tabular-nums">
                {rowCount} {rowCount === 1 ? "row" : "rows"}
              </span>
            </button>
          )}
        </div>
      </td>
      <td className="hidden md:table-cell px-2 py-1.5 text-xs text-muted-foreground truncate align-middle">
        {ownerLabel}
      </td>
      <td className="hidden lg:table-cell px-2 py-1.5 text-xs text-muted-foreground truncate align-middle">
        {host ? (
          onOpenSource ? (
            <button
              type="button"
              onClick={() => onOpenSource("page", host.id)}
              className="hover:text-foreground transition truncate max-w-full"
            >
              <span className="inline-flex items-center gap-1.5 min-w-0">
                {host.icon ? (
                  <DynamicIcon value={host.icon} className="text-xs" />
                ) : (
                  <FileText className="h-3 w-3 opacity-60" />
                )}
                <span className="truncate">{host.title || "Untitled"}</span>
              </span>
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <FileText className="h-3 w-3 opacity-60" />
              <span className="truncate">{host.title || "Untitled"}</span>
            </span>
          )
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <Folder className="h-3 w-3 opacity-60" />
            Root
          </span>
        )}
      </td>
      <td className="hidden md:table-cell px-2 py-1.5 text-xs text-muted-foreground align-middle">
        {relTime(db.updatedAt)}
      </td>
      <td className="px-2 py-1.5 text-right align-middle">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 opacity-0 group-hover/row:opacity-100 transition data-[state=open]:opacity-100"
              aria-label="Database actions"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onOpen}>
              <ExternalLink className="mr-2 h-3.5 w-3.5" /> Open
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => { setDraft(db.name); setRenaming(true); }}>
              <Pencil className="mr-2 h-3.5 w-3.5" /> Rename
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
