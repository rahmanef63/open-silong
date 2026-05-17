import { Database, DatabaseViewConfig, Page, Property } from "@/shared/types/domain";
import { PropertyCell } from "../PropertyCell";
import { focusSiblingBySelector } from "@/shared/lib/keyboard";
import { cn } from "@/shared/lib/utils";
import { getVisibleProps } from "../lib/visibility";
import { useStore } from "@/shared/lib/store";
import { Plus, MoreHorizontal, Trash2 } from "lucide-react";
import { DynamicIcon } from "@/shared/components/icon-picker";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { Button } from "@/shared/ui/button";
import { QuickCreateDialog } from "../components/QuickCreateDialog";
import { useState } from "react";

interface Props { db: Database; view: DatabaseViewConfig; rows: Page[]; onOpenRow: (id: string) => void }

export function ListView({ db, view, rows, onOpenRow }: Props) {
  const { deleteRow } = useStore();
  const [quickOpen, setQuickOpen] = useState(false);
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
          <Button
            variant="ghost"
            onClick={() => onOpenRow(r.id)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                focusSiblingBySelector(e.currentTarget, "[data-db-nav-item]", e.key === "ArrowDown" ? 1 : -1);
              }
            }}
            data-db-nav-item
            className="flex-1 h-auto flex items-center gap-3 px-3 text-left min-w-0 font-normal justify-start hover:bg-transparent"
          >
            <DynamicIcon value={r.icon} className={cn(compact ? "text-sm" : "text-base")} />
            <span className={cn("flex-1 truncate", compact ? "text-xs" : "text-sm")}>{r.title || "Untitled"}</span>
          </Button>
          {summaries.map(p => (
            <div key={p.id} onClick={e => e.stopPropagation()}>
              <PropertyCell db={db} prop={p} row={r} compact />
            </div>
          ))}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 h-auto w-auto p-1 text-muted-foreground [&_svg]:size-3.5" aria-label="Row actions">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
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
      <Button
        variant="ghost"
        onClick={() => setQuickOpen(true)}
        className="flex w-full h-auto items-center gap-2 px-3 py-2 text-left text-xs font-normal text-muted-foreground rounded-none justify-start [&_svg]:size-3.5"
      >
        <Plus className="h-3.5 w-3.5" /> New row
      </Button>
      <QuickCreateDialog db={db} view={view} open={quickOpen} onOpenChange={setQuickOpen} onCreated={onOpenRow} />
    </div>
  );
}
