import { useMemo, useState } from "react";
import { Database, DatabaseViewConfig, Page } from "@/shared/types/domain";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { focusSiblingBySelector } from "@/shared/lib/keyboard";
import { QuickCreateDialog } from "../components/QuickCreateDialog";
import { useStore } from "@/shared/lib/store";
import { DynamicIcon } from "@/shared/components/icon-picker";
import { DAY_MS, makeBarStyle, msToYMD, toMs } from "./timeline/utils";
import { TimelineBar } from "./timeline/TimelineBar";
import { TimelineHeader } from "./timeline/HeaderRow";
import { TimelineDependencies } from "./timeline/Dependencies";

interface Props { db: Database; view: DatabaseViewConfig; rows: Page[]; onOpenRow: (id: string) => void }

export function TimelineView({ db, view, rows, onOpenRow }: Props) {
  const { setRowValue } = useStore();
  const [quickOpen, setQuickOpen] = useState(false);
  const dateProp =
    db.properties.find((p) => p.id === view.timelineStartProp && p.type === "date")
    ?? db.properties.find((p) => p.type === "date");
  const endProp =
    db.properties.find((p) => p.id === view.timelineEndProp && p.type === "date" && p.id !== dateProp?.id)
    ?? db.properties.find((p) => p.type === "date" && p.id !== dateProp?.id);
  const colorProp = db.properties.find((p) => p.id === view.timelineColorByProp && (p.type === "select" || p.type === "status"));
  // Dependency arrows: explicit configured prop, else first self-relation
  // prop pointing back at this DB.
  const depProp =
    db.properties.find((p) => p.id === view.timelineDependencyProp && p.type === "relation" && p.relationDatabaseId === db.id)
    ?? db.properties.find((p) => p.type === "relation" && p.relationDatabaseId === db.id);

  const zoom = view.timelineZoom ?? "month";
  const CELL_W = zoom === "day" ? 64 : zoom === "week" ? 40 : zoom === "quarter" ? 14 : 32;
  const DAYS = zoom === "day" ? 14 : zoom === "week" ? 28 : zoom === "quarter" ? 90 : 28;
  const LABEL_W = 160;

  const now = new Date();
  const [startOffset, setStartOffset] = useState(0);

  const weekStart = useMemo(() => {
    const d = new Date(now);
    d.setDate(d.getDate() - d.getDay() + startOffset * 7);
    d.setHours(0, 0, 0, 0);
    return d;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startOffset]);
  const days = useMemo(() => Array.from({ length: DAYS }, (_, i) => {
    return new Date(weekStart.getTime() + i * DAY_MS);
  }), [weekStart, DAYS]);

  const rangeStart = weekStart.getTime();
  const rangeEnd = rangeStart + DAYS * DAY_MS;

  const todayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const todayOffset = todayMs - rangeStart;
  const todayPx = todayOffset >= 0 ? Math.floor(todayOffset / DAY_MS) * CELL_W : -1;

  const items = useMemo(() => {
    if (!dateProp) return [];
    return rows
      .map((r) => {
        const startVal = r.rowProps?.[dateProp.id] as { date?: string; end?: string } | undefined;
        const startStr = startVal?.date;
        // Prefer explicit endProp; fall back to start property's own `end` field.
        const endStr = endProp
          ? (r.rowProps?.[endProp.id] as { date?: string } | undefined)?.date
          : startVal?.end;
        if (!startStr) return null;
        const startMs = toMs(startStr);
        const endMs = endStr ? toMs(endStr) : startMs;
        return { row: r, startMs, endMs };
      })
      .filter((x): x is NonNullable<typeof x> => !!x);
  }, [rows, dateProp, endProp]);

  const getBarStyle = makeBarStyle(rangeStart, DAYS, CELL_W);
  const ROW_H = 32;
  const rowIndex = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r, i) => m.set(r.id, i));
    return m;
  }, [rows]);
  const totalH = rows.length * ROW_H;

  return (
    <div className="p-3 overflow-x-auto">
      <div className="flex items-center gap-2 mb-3">
        <button onClick={() => setStartOffset((o) => o - 4)} className="rounded p-1 hover:bg-accent text-muted-foreground">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button onClick={() => setStartOffset((o) => o + 4)} className="rounded p-1 hover:bg-accent text-muted-foreground">
          <ChevronRight className="h-4 w-4" />
        </button>
        {startOffset !== 0 && (
          <button onClick={() => setStartOffset(0)} className="rounded px-2 py-1 text-xs border border-border hover:bg-accent text-muted-foreground">
            Today
          </button>
        )}
        <span className="text-xs text-muted-foreground">
          {days[0].toLocaleDateString("default", { month: "short", day: "numeric" })} – {days[DAYS - 1].toLocaleDateString("default", { month: "short", day: "numeric", year: "numeric" })}
        </span>
        {!dateProp && (
          <span className="text-xs text-muted-foreground ml-2">(add a Date property to see bars)</span>
        )}
        <button
          onClick={() => setQuickOpen(true)}
          className="ml-auto flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs hover:bg-accent text-muted-foreground"
        >
          <Plus className="h-3 w-3" /> New row
        </button>
      </div>

      <div style={{ minWidth: LABEL_W + DAYS * CELL_W }}>
        <TimelineHeader
          days={days}
          cellW={CELL_W}
          todayMs={todayMs}
          todayPx={todayPx}
          daysCount={DAYS}
          labelW={LABEL_W}
        />

        <div className="relative">
        {depProp && (
          <TimelineDependencies
            items={items.filter((it) => it.endMs >= rangeStart && it.startMs < rangeEnd)}
            rowIndex={rowIndex}
            getBarStyle={getBarStyle}
            depProp={depProp}
            rowHeight={ROW_H}
            labelW={LABEL_W}
            width={LABEL_W + DAYS * CELL_W}
            height={totalH}
          />
        )}
        {rows.map((row) => {
          const item = items.find((x) => x.row.id === row.id);
          const bar = item ? getBarStyle(item) : null;
          const inView = item && (item.endMs >= rangeStart && item.startMs < rangeEnd);
          return (
            <div key={row.id} className="flex border-b border-border/50 hover:bg-muted/20 group" style={{ minHeight: 32 }}>
              <button
                style={{ width: LABEL_W }}
                onClick={() => onOpenRow(row.id)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                    e.preventDefault();
                    focusSiblingBySelector(e.currentTarget, "[data-db-nav-item]", e.key === "ArrowDown" ? 1 : -1);
                  }
                }}
                data-db-nav-item
                className="shrink-0 flex items-center gap-1 text-xs px-2 border-r border-border text-left truncate hover:underline underline-offset-2"
              >
                <DynamicIcon value={row.icon} className="text-sm" />
                <span className="truncate">{row.title || "Untitled"}</span>
              </button>
              <div className="relative flex-1" style={{ width: DAYS * CELL_W }}>
                {days.map((d, i) => (
                  <div
                    key={i}
                    className={cn("absolute top-0 bottom-0 border-r border-border/30", d.getTime() === todayMs && "bg-brand/5")}
                    style={{ left: i * CELL_W, width: CELL_W }}
                  />
                ))}
                {bar && inView && item && (
                  <TimelineBar
                    row={row}
                    item={item}
                    bar={bar}
                    cellW={CELL_W}
                    colorProp={colorProp}
                    onOpenRow={onOpenRow}
                    onShift={(deltaDays, mode) => {
                      if (!dateProp || deltaDays === 0) return;
                      let nextStartMs = item.startMs;
                      let nextEndMs = item.endMs;
                      if (mode === "move") {
                        nextStartMs = item.startMs + deltaDays * DAY_MS;
                        nextEndMs = item.endMs + deltaDays * DAY_MS;
                      } else if (mode === "start") {
                        nextStartMs = Math.min(item.startMs + deltaDays * DAY_MS, item.endMs);
                      } else if (mode === "end") {
                        nextEndMs = Math.max(item.endMs + deltaDays * DAY_MS, item.startMs);
                      }
                      const newStartStr = msToYMD(nextStartMs);
                      const newEndStr = msToYMD(nextEndMs);
                      if (endProp) {
                        if (mode === "move" || mode === "start") {
                          setRowValue(db.id, row.id, dateProp.id, { date: newStartStr });
                        }
                        if (mode === "move" || mode === "end") {
                          setRowValue(db.id, row.id, endProp.id, { date: newEndStr });
                        }
                      } else {
                        // No separate endProp — write both start and end into the start property.
                        const cur = row.rowProps?.[dateProp.id] as { date?: string; end?: string } | undefined;
                        const next: { date?: string; end?: string } = { ...cur };
                        if (mode === "move" || mode === "start") next.date = newStartStr;
                        if (mode === "move" || mode === "end") next.end = newEndStr;
                        setRowValue(db.id, row.id, dateProp.id, next);
                      }
                    }}
                  />
                )}
                {!item && (
                  <div className="absolute inset-y-0 flex items-center px-2">
                    <span className="text-[10px] text-muted-foreground/40">—</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {rows.length === 0 && (
          <div className="p-4 text-sm text-muted-foreground text-center">No rows.</div>
        )}
        </div>
      </div>
      <QuickCreateDialog
        db={db}
        view={view}
        open={quickOpen}
        onOpenChange={setQuickOpen}
        prefill={dateProp ? { [dateProp.id]: { date: new Date().toISOString().slice(0, 10) } } : undefined}
        onCreated={onOpenRow}
      />
    </div>
  );
}
