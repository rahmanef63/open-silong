import { useMemo } from "react";
import { cn } from "@/shared/lib/utils";
import type { CalcKind, Database, DatabaseViewConfig, Page, Property } from "@/shared/types/domain";
import { calcLabel, computeCalc } from "../../lib/calcAggregate";

export function CalcFooter({ db: _db, view, rows, visibleProps }: { db: Database; view: DatabaseViewConfig; rows: Page[]; visibleProps: Property[] }) {
  void _db;
  const calcs = view.tableCalcs ?? {};
  const hasAny = Object.values(calcs).some((c) => c && c !== "none");
  // Aggregate over every row is O(rows × cols); memoize so it only recomputes
  // when the rows / calc config / visible columns actually change, not on
  // unrelated table re-renders (selection, hover, expand).
  const displays = useMemo(() => {
    const out: Record<string, string> = {};
    for (const p of visibleProps) {
      const c = (calcs[p.id] ?? "none") as CalcKind;
      out[p.id] = c === "none" ? "" : computeCalc(rows, p, c);
    }
    return out;
  }, [rows, visibleProps, calcs]);
  if (!hasAny) return null;
  return (
    <div className="flex border-t border-border bg-muted/20 text-[11px] text-muted-foreground">
      <div className="w-8 border-r border-border" aria-hidden />
      {visibleProps.map((p) => {
        const c = (calcs[p.id] ?? "none") as CalcKind;
        const isFrozen = view.frozenPropIds?.includes(p.id) ?? false;
        const display = displays[p.id];
        return (
          <div
            key={p.id}
            className={cn(
              "flex flex-col gap-0 border-r border-border px-2 py-1 min-w-[160px] flex-1 truncate",
              isFrozen && "sticky left-0 z-10 bg-muted/40",
            )}
            title={display ? `${calcLabel(c)}: ${display}` : ""}
          >
            {display && <>
              <span className="text-[9px] uppercase tracking-wider opacity-60">{calcLabel(c)}</span>
              <span className="text-foreground tabular-nums truncate">{display}</span>
            </>}
          </div>
        );
      })}
      <div className="flex-1" />
    </div>
  );
}
