import { useMemo } from "react";
import { Database, DatabaseViewConfig, Page, Property } from "@/shared/types/domain";
import { PropertyCell } from "../PropertyCell";
import { useStore } from "@/shared/lib/store";
import { Clock, Plus, MoreHorizontal, Trash2 } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { formatDateWeekday } from "@/shared/lib/format";
import { focusSiblingBySelector } from "@/shared/lib/keyboard";
import { getVisibleProps } from "../lib/visibility";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { QuickCreateDialog } from "../components/QuickCreateDialog";
import { DynamicIcon } from "@/shared/components/icon-picker";
import { useState } from "react";

interface Props { db: Database; view: DatabaseViewConfig; rows: Page[]; onOpenRow: (id: string) => void }

function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dayLabel(ts: number): string {
  const d = new Date(ts);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yest = new Date(today); yest.setDate(yest.getDate() - 1);
  const dd = new Date(d); dd.setHours(0, 0, 0, 0);
  if (dd.getTime() === today.getTime()) return "Today";
  if (dd.getTime() === yest.getTime()) return "Yesterday";
  return formatDateWeekday(ts);
}

function timeLabel(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function FeedView({ db, view, rows, onOpenRow }: Props) {
  const { updateView, deleteRow } = useStore();
  const [quickOpen, setQuickOpen] = useState(false);
  const source = view.feedTimestamp ?? "updatedAt";

  const grouped = useMemo(() => {
    const sorted = [...rows].sort((a, b) =>
      (b[source] ?? b.updatedAt ?? 0) - (a[source] ?? a.updatedAt ?? 0)
    );
    const buckets = new Map<string, Page[]>();
    for (const r of sorted) {
      const ts = (r[source] ?? r.updatedAt ?? Date.now()) as number;
      const k = dayKey(ts);
      const arr = buckets.get(k) ?? [];
      arr.push(r);
      buckets.set(k, arr);
    }
    return [...buckets.entries()].map(([key, items]) => {
      const ts = (items[0][source] ?? items[0].updatedAt ?? Date.now()) as number;
      return { key, label: dayLabel(ts), items };
    });
  }, [rows, source]);

  const viewVisible = getVisibleProps(db, view);
  const visibleSet = new Set(viewVisible.map(p => p.id));
  const summaryProps: Property[] = view.feedSummaryProps?.length
    ? view.feedSummaryProps
        .map(id => db.properties.find(p => p.id === id))
        .filter((p): p is Property => !!p && visibleSet.has(p.id))
    : viewVisible.filter(p => p.type !== "text").slice(0, 3);

  const compact = (view.feedDensity ?? "comfortable") === "compact";

  return (
    <div className="p-3">
      <div className="flex items-center justify-between gap-1 text-xs mb-2">
        <button
          onClick={() => setQuickOpen(true)}
          className="flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 hover:bg-accent text-muted-foreground"
        >
          <Plus className="h-3 w-3" /> New row
        </button>
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground">Sort by:</span>
          <button
            onClick={() => updateView(db.id, view.id, { feedTimestamp: "updatedAt" })}
            className={cn("rounded px-2 py-0.5 hover:bg-accent",
              source === "updatedAt" ? "bg-accent font-medium" : "text-muted-foreground")}
          >Last edited</button>
          <button
            onClick={() => updateView(db.id, view.id, { feedTimestamp: "createdAt" })}
            className={cn("rounded px-2 py-0.5 hover:bg-accent",
              source === "createdAt" ? "bg-accent font-medium" : "text-muted-foreground")}
          >Created</button>
        </div>
      </div>

      {grouped.length === 0 && (
        <div className="py-10 text-center text-sm text-muted-foreground">No rows</div>
      )}

      <div className="relative">
        {/* Timeline rail */}
        <div className="absolute left-3 top-0 bottom-0 w-px bg-border" aria-hidden />
        {grouped.map(g => (
          <div key={g.key} className="relative pl-9 pb-4">
            <div className="absolute left-0 top-0 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground">
                <Clock className="h-3 w-3" />
              </span>
              <span className="text-xs font-semibold">{g.label}</span>
            </div>
            <div className="mt-7 space-y-2">
              {g.items.map(r => {
                const ts = (r[source] ?? r.updatedAt ?? Date.now()) as number;
                return (
                  <div key={r.id} className="relative group">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="absolute top-1 right-1 z-10 opacity-0 group-hover:opacity-100 rounded bg-card/90 backdrop-blur p-1 hover:bg-accent text-muted-foreground" aria-label="Row actions">
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
                  <button
                    onClick={() => onOpenRow(r.id)}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                        e.preventDefault();
                        focusSiblingBySelector(e.currentTarget, "[data-db-nav-item]", e.key === "ArrowDown" ? 1 : -1);
                      }
                    }}
                    data-db-nav-item
                    className={cn(
                      "block w-full text-left rounded-lg border border-border bg-card hover:border-border-strong hover:bg-accent/40 transition",
                      compact ? "p-2" : "p-3",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="flex items-center gap-1.5 text-sm font-medium min-w-0">
                        <DynamicIcon value={r.icon} className="text-sm" />
                        <span className="truncate">{r.title || "Untitled"}</span>
                      </span>
                      <span className="text-[10px] text-muted-foreground shrink-0">{timeLabel(ts)}</span>
                    </div>
                    {!compact && summaryProps.length > 0 && (
                      <div className="flex flex-wrap gap-1 -mx-1">
                        {summaryProps.map(p => (
                          <div key={p.id} onClick={e => e.stopPropagation()} className="text-xs">
                            <PropertyCell db={db} prop={p} row={r} compact />
                          </div>
                        ))}
                      </div>
                    )}
                  </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <QuickCreateDialog db={db} view={view} open={quickOpen} onOpenChange={setQuickOpen} onCreated={onOpenRow} />
    </div>
  );
}
