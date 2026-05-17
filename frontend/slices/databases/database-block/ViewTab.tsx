import { useState } from "react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Copy, Trash2, Lock, Unlock } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import type { Database, DatabaseViewConfig } from "@/shared/types/domain";
import { VIEW_META } from "./lazyViews";

export function ViewTab({ db: _db, v, active, onActivate, onRename, onDuplicate, onDelete, onToggleLock }: {
  db: Database;
  v: DatabaseViewConfig;
  active: boolean;
  onActivate: () => void;
  onRename: (name: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleLock?: () => void;
}) {
  void _db;
  const locked = !!v.locked;
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
      <Button
        variant="ghost"
        onClick={onActivate}
        onDoubleClick={(e) => { e.preventDefault(); setEditing(true); }}
        title="Click to activate · Double-click to rename"
        className="h-auto gap-1 px-2 py-1 text-xs font-normal hover:bg-transparent [&_svg]:size-3.5"
      >
        <Meta.icon className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{v.name}</span>
        {locked && <Lock className="h-3 w-3 text-amber-600 dark:text-amber-400" aria-label="View locked" />}
      </Button>
      {active && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="View actions"
              title="View actions"
              className="h-6 w-5 p-0 rounded-md text-muted-foreground hover:text-foreground hover:bg-background [&_svg]:size-3.5"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => { setDraft(v.name); setEditing(true); }}>
              <Pencil className="mr-2 h-3.5 w-3.5" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy className="mr-2 h-3.5 w-3.5" /> Duplicate
            </DropdownMenuItem>
            {onToggleLock && (
              <DropdownMenuItem onClick={onToggleLock}>
                {locked ? <Unlock className="mr-2 h-3.5 w-3.5" /> : <Lock className="mr-2 h-3.5 w-3.5" />}
                {locked ? "Unlock view" : "Lock view"}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem className="text-destructive" onClick={onDelete}>
              <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete view
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
