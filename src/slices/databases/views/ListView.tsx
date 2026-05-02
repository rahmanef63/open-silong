import { Database, DatabaseViewConfig, Page, Property } from "@/shared/types/domain";
import { PropertyCell } from "../PropertyCell";
import { focusSiblingBySelector } from "@/shared/lib/keyboard";
import { cn } from "@/shared/lib/utils";
import { getVisibleProps } from "../lib/visibility";
import { useStore } from "@/shared/lib/store";
import { Plus, MoreHorizontal, Trash2 } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

interface Props { db: Database; view: DatabaseViewConfig; rows: Page[]; onOpenRow: (id: string) => void }

export function ListView({ db, view, rows, onOpenRow }: Props) {
  const { addRow, deleteRow } = useStore();
  const viewVisible = getVisibleProps(db, view);
  const visibleSet = new Set(viewVisible.map(p => p.id));
  const summaries: Property[] = view.listSummaryProps?.length
    ? view.listSummaryProps
        .map(id => db.properties.find(p => p.id === id))
        .filter((p): p is Property => !!p && visibleSet.has(p.id))
    : (() => {
        const first = viewVisible.find(p => p.type !== "text");
        return first ? [first] : [];
      })();

  const compact = (view.listDensity ?? "comfortable") === "compact";

  return (
    <div className="divide-y divide-border">
      {rows.length === 0 && (
        <div className="px-4 py-10 text-center text-sm text-muted-foreground">No rows</div>
      )}
      {rows.map(r => (
        <div
          key={r.id}
          className={cn(
            "flex items-center gap-2 pr-2 hover:bg-accent transition group",
            compact ? "py-1" : "py-2"
          )}
        >
          <button
            onClick={() => onOpenRow(r.id)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                focusSiblingBySelector(e.currentTarget, "[data-db-nav-item]", e.key === "ArrowDown" ? 1 : -1);
              }
            }}
            data-db-nav-item
            className="flex-1 flex items-center gap-3 px-3 text-left min-w-0"
          >
            <span className={cn(compact ? "text-sm" : "text-base")}>{r.icon}</span>
            <span className={cn("flex-1 truncate", compact ? "text-xs" : "text-sm")}>{r.title || "Untitled"}</span>
          </button>
          {summaries.map(p => (
            <div key={p.id} onClick={e => e.stopPropagation()}>
              <PropertyCell db={db} prop={p} row={r} compact />
            </div>
          ))}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="opacity-0 group-hover:opacity-100 rounded p-1 hover:bg-accent text-muted-foreground" aria-label="Row actions">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onOpenRow(r.id)}>Open</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={() => deleteRow(db.id, r.id)}>
                <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ))}
      <button
        onClick={async () => {
          const r = await addRow(db.id);
          onOpenRow(r.id);
        }}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-muted-foreground hover:bg-accent"
      >
        <Plus className="h-3.5 w-3.5" /> New row
      </button>
    </div>
  );
}
