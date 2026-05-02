import { useMemo, useState } from "react";
import { Database, DatabaseViewConfig, Page } from "@/shared/types/domain";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { focusSiblingBySelector } from "@/shared/lib/keyboard";
import { colorClass } from "@/shared/lib/format";
import { QuickCreateDialog } from "../components/QuickCreateDialog";

interface Props { db: Database; view: DatabaseViewConfig; rows: Page[]; onOpenRow: (id: string) => void }

const DAY_MS = 86400000;

function toMs(dateStr: string): number {
  return new Date(dateStr + "T00:00:00").getTime();
}

export function TimelineView({ db, view, rows, onOpenRow }: Props) {
  const [quickOpen, setQuickOpen] = useState(false);
  const dateProp =
    db.properties.find(p => p.id === view.timelineStartProp && p.type === "date")
    ?? db.properties.find(p => p.type === "date");
  const endProp =
    db.properties.find(p => p.id === view.timelineEndProp && p.type === "date" && p.id !== dateProp?.id)
    ?? db.properties.find(p => p.type === "date" && p.id !== dateProp?.id);
  const colorProp = db.properties.find(p => p.id === view.timelineColorByProp && (p.type === "select" || p.type === "status"));

  const zoom = view.timelineZoom ?? "month";
  const CELL_W = zoom === "day" ? 64 : zoom === "week" ? 40 : zoom === "quarter" ? 14 : 32;
  const DAYS = zoom === "day" ? 14 : zoom === "week" ? 28 : zoom === "quarter" ? 90 : 28;

  const now = new Date();
  const [startOffset, setStartOffset] = useState(0);

  const weekStart = useMemo(() => {
    const d = new Date(now);
    d.setDate(d.getDate() - d.getDay() + startOffset * 7);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [startOffset]);
  const days = useMemo(() => Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(weekStart.getTime() + i * DAY_MS);
    return d;
  }), [weekStart]);

  const rangeStart = weekStart.getTime();
  const rangeEnd = rangeStart + DAYS * DAY_MS;

  const todayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const todayOffset = todayMs - rangeStart;
  const todayPx = todayOffset >= 0 ? Math.floor(todayOffset / DAY_MS) * CELL_W : -1;

  // items with at least a start date
  const items = useMemo(() => {
    if (!dateProp) return [];
    return rows
      .map(r => {
        const startStr = (r.rowProps?.[dateProp.id] as any)?.date;
        const endStr = endProp ? (r.rowProps?.[endProp.id] as any)?.date : null;
        if (!startStr) return null;
        const startMs = toMs(startStr);
        const endMs = endStr ? toMs(endStr) : startMs;
        return { row: r, startMs, endMs };
      })
      .filter((x): x is NonNullable<typeof x> => !!x);
  }, [rows, dateProp, endProp]);

  const itemsInView = items.filter(x => x.endMs >= rangeStart && x.startMs < rangeEnd);

  const getBarStyle = (x: { startMs: number; endMs: number }) => {
    const left = Math.max(0, Math.floor((x.startMs - rangeStart) / DAY_MS)) * CELL_W;
    const rawRight = Math.floor((x.endMs - rangeStart) / DAY_MS + 1) * CELL_W;
    const right = Math.min(DAYS * CELL_W, rawRight);
    const width = Math.max(CELL_W, right - left);
    return { left, width };
  };

  const LABEL_W = 160;

  return (
    <div className="p-3 overflow-x-auto">
      {/* Nav */}
      <div className="flex items-center gap-2 mb-3">
        <button onClick={() => setStartOffset(o => o - 4)} className="rounded p-1 hover:bg-accent text-muted-foreground">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button onClick={() => setStartOffset(o => o + 4)} className="rounded p-1 hover:bg-accent text-muted-foreground">
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

      {/* Grid */}
      <div style={{ minWidth: LABEL_W + DAYS * CELL_W }}>
        {/* Header row: days */}
        <div className="flex border-b border-border bg-muted/30">
          <div style={{ width: LABEL_W }} className="shrink-0 text-[10px] text-muted-foreground px-2 py-1 border-r border-border">
            Name
          </div>
          <div className="relative flex" style={{ width: DAYS * CELL_W }}>
            {days.map((d, i) => {
              const isToday = d.getTime() === todayMs;
              const isWeekStart = d.getDay() === 0;
              return (
                <div
                  key={i}
                  style={{ width: CELL_W }}
                  className={cn(
                    "shrink-0 border-r border-border/50 px-0.5 py-1 text-[9px] text-center",
                    isToday ? "bg-brand/10 text-brand font-bold" : "text-muted-foreground",
                    isWeekStart && "border-r-border"
                  )}
                >
                  {d.getDate()}
                  {(i === 0 || d.getDate() === 1) && (
                    <div className="text-[8px] leading-none mt-0.5 opacity-70">
                      {d.toLocaleString("default", { month: "short" })}
                    </div>
                  )}
                </div>
              );
            })}
            {/* Today indicator */}
            {todayPx >= 0 && todayPx < DAYS * CELL_W && (
              <div
                className="absolute top-0 bottom-0 w-px bg-brand/60 pointer-events-none z-10"
                style={{ left: todayPx + CELL_W / 2 }}
              />
            )}
          </div>
        </div>

        {/* Rows */}
        {rows.map(row => {
          const item = items.find(x => x.row.id === row.id);
          const bar = item ? getBarStyle(item) : null;
          const inView = item && (item.endMs >= rangeStart && item.startMs < rangeEnd);
          return (
            <div key={row.id} className="flex border-b border-border/50 hover:bg-muted/20 group" style={{ minHeight: 32 }}>
              {/* Label */}
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
                <span>{row.icon}</span>
                <span className="truncate">{row.title || "Untitled"}</span>
              </button>
              {/* Bar area */}
              <div className="relative flex-1" style={{ width: DAYS * CELL_W }}>
                {/* Day grid lines */}
                {days.map((d, i) => (
                  <div
                    key={i}
                    className={cn("absolute top-0 bottom-0 border-r border-border/30", d.getTime() === todayMs && "bg-brand/5")}
                    style={{ left: i * CELL_W, width: CELL_W }}
                  />
                ))}
                {/* Bar */}
                {bar && inView && (() => {
                  const colorOpt = colorProp
                    ? colorProp.options?.find((o: any) => o.id === row.rowProps?.[colorProp.id])
                    : null;
                  const tone = colorOpt?.color
                    ? colorClass(colorOpt.color)
                    : "bg-brand/70 hover:bg-brand text-white";
                  return (
                    <button
                      onClick={() => onOpenRow(row.id)}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                          e.preventDefault();
                          focusSiblingBySelector(e.currentTarget, "[data-db-nav-item]", e.key === "ArrowDown" ? 1 : -1);
                        }
                      }}
                      data-db-nav-item
                      title={colorOpt?.name ?? undefined}
                      className={cn(
                        "absolute top-1 h-6 rounded-full text-[10px] font-medium px-2 truncate flex items-center transition z-10 border",
                        tone,
                      )}
                      style={{ left: bar.left, width: bar.width }}
                    >
                      {bar.width > 40 && (row.title || "Untitled")}
                    </button>
                  );
                })()}
                {/* No-date indicator */}
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
