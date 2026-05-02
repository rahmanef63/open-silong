import { Database, DatabaseViewConfig, Page, Property } from "@/shared/types/domain";
import { PropertyCell } from "../PropertyCell";
import { focusSiblingBySelector } from "@/shared/lib/keyboard";
import { cn } from "@/shared/lib/utils";

interface Props { db: Database; view: DatabaseViewConfig; rows: Page[]; onOpenRow: (id: string) => void }

export function ListView({ db, view, rows, onOpenRow }: Props) {
  const summaries: Property[] = view.listSummaryProps?.length
    ? view.listSummaryProps
        .map(id => db.properties.find(p => p.id === id))
        .filter((p): p is Property => !!p && !p.hidden)
    : (() => {
        const first = db.properties.find(p => !p.hidden && p.type !== "text");
        return first ? [first] : [];
      })();

  const compact = (view.listDensity ?? "comfortable") === "compact";

  return (
    <div className="divide-y divide-border">
      {rows.length === 0 && (
        <div className="px-4 py-10 text-center text-sm text-muted-foreground">No rows</div>
      )}
      {rows.map(r => (
        <button
          key={r.id}
          onClick={() => onOpenRow(r.id)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              focusSiblingBySelector(e.currentTarget, "[data-db-nav-item]", e.key === "ArrowDown" ? 1 : -1);
            }
          }}
          data-db-nav-item
          className={cn(
            "flex w-full items-center gap-3 px-3 text-left hover:bg-accent transition",
            compact ? "py-1" : "py-2"
          )}
        >
          <span className={cn(compact ? "text-sm" : "text-base")}>{r.icon}</span>
          <span className={cn("flex-1 truncate", compact ? "text-xs" : "text-sm")}>{r.title || "Untitled"}</span>
          {summaries.map(p => (
            <div key={p.id} onClick={e => e.stopPropagation()}>
              <PropertyCell db={db} prop={p} row={r} compact />
            </div>
          ))}
        </button>
      ))}
    </div>
  );
}
