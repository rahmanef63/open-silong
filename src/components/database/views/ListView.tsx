import { Database, DatabaseViewConfig, Page } from "@/lib/types";
import { PropertyCell } from "../PropertyCell";
import { focusSiblingBySelector } from "@/shared/lib/keyboard";

interface Props { db: Database; view: DatabaseViewConfig; rows: Page[]; onOpenRow: (id: string) => void }

export function ListView({ db, rows, onOpenRow }: Props) {
  const summaryProp = db.properties.find(p => !p.hidden && p.type !== "text");
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
          className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-accent transition"
        >
          <span className="text-base">{r.icon}</span>
          <span className="flex-1 text-sm truncate">{r.title || "Untitled"}</span>
          {summaryProp && <div onClick={e => e.stopPropagation()}><PropertyCell db={db} prop={summaryProp} row={r} compact /></div>}
        </button>
      ))}
    </div>
  );
}
