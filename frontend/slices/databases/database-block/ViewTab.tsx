import { useState } from "react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Copy, Trash2 } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import type { Database, DatabaseViewConfig } from "@/shared/types/domain";
import { VIEW_META } from "./lazyViews";

export function ViewTab({ db: _db, v, active, onActivate, onRename, onDuplicate, onDelete }: {
  db: Database;
  v: DatabaseViewConfig;
  active: boolean;
  onActivate: () => void;
  onRename: (name: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  void _db;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(v.name);
  const Meta = VIEW_META[v.type];

  const commit = () => {
    setEditing(false);
    if (draft.trim()) onRename(draft.trim());
    else setDraft(v.name);
  };

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setEditing(false);
            setDraft(v.name);
          }
        }}
        className="rounded-md px-2 py-1 text-xs border border-brand outline-none bg-background w-24"
      />
    );
  }

  return (
    <div className={cn(
      "group/tab flex items-center rounded-md text-xs transition select-none",
      active ? "bg-accent text-foreground font-medium" : "hover:bg-accent",
    )}>
      <button
        onClick={onActivate}
        onDoubleClick={(e) => { e.preventDefault(); setEditing(true); }}
        title="Click to activate · Double-click to rename"
        className="flex items-center gap-1 px-2 py-1"
      >
        <Meta.icon className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{v.name}</span>
      </button>
      {active && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="View actions"
              title="View actions"
              className="flex h-6 w-5 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-background"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => { setDraft(v.name); setEditing(true); }}>
              <Pencil className="mr-2 h-3.5 w-3.5" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy className="mr-2 h-3.5 w-3.5" /> Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={onDelete}>
              <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete view
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
