import { useMemo, useState } from "react";
import { Database, DatabaseViewConfig, Page, Property } from "@/shared/types/domain";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { focusSiblingBySelector } from "@/shared/lib/keyboard";
import { colorClass } from "@/shared/lib/format";
import { useStore } from "@/shared/lib/store";

interface Props { db: Database; view: DatabaseViewConfig; rows: Page[]; onOpenRow: (id: string) => void }

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseYMD(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function CalendarView({ db, view, rows, onOpenRow }: Props) {
  const { addRow } = useStore();
  const dateProp = useMemo(
    () => db.properties.find(p => p.id === view.calendarDateProp && p.type === "date")
      ?? db.properties.find(p => p.type === "date"),
    [db.properties, view.calendarDateProp],
  );
  const endProp = useMemo(
    () => db.properties.find(p => p.id === view.calendarEndProp && p.type === "date"),
    [db.properties, view.calendarEndProp],
  );
  const colorProp = useMemo(
    () => db.properties.find(p => p.id === view.calendarColorByProp && (p.type === "select" || p.type === "status")),
    [db.properties, view.calendarColorByProp],
  );

  const weekStart = view.calendarWeekStart ?? 0;
  const showWeekends = view.calendarShowWeekends ?? true;

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const prev = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const next = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };
  const goToday = () => { setYear(now.getFullYear()); setMonth(now.getMonth()); };

  const first = new Date(year, month, 1);
  const startDay = (first.getDay() - weekStart + 7) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(new Date(year, month, d));

  // Map from YYYY-MM-DD → events on that day
  const rowsByDate = useMemo(() => {
    const m = new Map<string, Page[]>();
    if (!dateProp) return m;
    for (const r of rows) {
      const startStr = (r.rowProps?.[dateProp.id] as any)?.date;
      if (!startStr) continue;
      const start = parseYMD(startStr);
      if (!start) continue;
      const endStr = endProp ? (r.rowProps?.[endProp.id] as any)?.date : undefined;
      const end = endStr ? parseYMD(endStr) : start;
      if (!end || end < start) {
        const key = ymd(start);
        const arr = m.get(key) ?? [];
        arr.push(r);
        m.set(key, arr);
        continue;
      }
      const cursor = new Date(start);
      while (cursor <= end) {
        const key = ymd(cursor);
        const arr = m.get(key) ?? [];
        arr.push(r);
        m.set(key, arr);
        cursor.setDate(cursor.getDate() + 1);
      }
    }
    return m;
  }, [rows, dateProp, endProp]);

  const todayStr = ymd(now);
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const orderedDays = [...dayLabels.slice(weekStart), ...dayLabels.slice(0, weekStart)];

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1">
          <button onClick={prev} className="rounded p-1 hover:bg-accent text-muted-foreground">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={next} className="rounded p-1 hover:bg-accent text-muted-foreground">
            <ChevronRight className="h-4 w-4" />
          </button>
          {!isCurrentMonth && (
            <button onClick={goToday} className="ml-1 rounded px-2 py-1 text-xs hover:bg-accent text-muted-foreground border border-border">
              Today
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">
            {first.toLocaleString("default", { month: "long", year: "numeric" })}
          </span>
          {!dateProp && (
            <span className="text-xs text-muted-foreground">(add a Date property)</span>
          )}
        </div>
      </div>

      <div className={cn(
        "grid gap-px bg-border rounded-md overflow-hidden text-xs",
        showWeekends ? "grid-cols-7" : "grid-cols-5",
      )}>
        {orderedDays.map((d, i) => {
          const isWeekend = (weekStart + i) % 7 === 0 || (weekStart + i) % 7 === 6;
          if (!showWeekends && isWeekend) return null;
          return (
            <div key={d} className="bg-muted/40 px-2 py-1 text-muted-foreground font-medium text-[10px] uppercase tracking-wider">{d}</div>
          );
        })}
        {cells.map((d, i) => {
          const dayOfWeek = d ? d.getDay() : null;
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          if (!showWeekends && isWeekend) return null;
          const key = d ? ymd(d) : `e${i}`;
          const items = d ? (rowsByDate.get(key) ?? []) : [];
          const isToday = key === todayStr;
          return (
            <div key={key} className={cn("bg-card min-h-20 p-1.5 group relative", isToday && "bg-brand/5")}>
              {d && (
                <div className="flex items-center justify-between mb-1">
                  <div className={cn(
                    "text-[10px] w-5 h-5 flex items-center justify-center rounded-full",
                    isToday ? "bg-brand text-white font-bold" : "text-muted-foreground"
                  )}>
                    {d.getDate()}
                  </div>
                  {dateProp && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        const nr = await addRow(db.id, { rowProps: { [dateProp.id]: { date: key } } });
                        onOpenRow(nr.id);
                      }}
                      title="Add row on this date"
                      className="opacity-0 group-hover:opacity-100 rounded p-0.5 hover:bg-accent text-muted-foreground"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )}
              <div className="space-y-0.5">
                {items.map(r => {
                  const colorOpt: { color?: string; name?: string } | null = colorProp
                    ? colorProp.options?.find((o: any) => o.id === r.rowProps?.[colorProp.id]) ?? null
                    : null;
                  const tone = colorOpt?.color
                    ? colorClass(colorOpt.color)
                    : "bg-brand/15 text-brand hover:bg-brand/25";
                  return (
                    <button
                      key={r.id}
                      onClick={() => onOpenRow(r.id)}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "ArrowLeft" || e.key === "ArrowRight") {
                          e.preventDefault();
                          const delta = e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 1;
                          focusSiblingBySelector(e.currentTarget, "[data-db-nav-item]", delta as 1 | -1);
                        }
                      }}
                      data-db-nav-item
                      title={colorOpt?.name ?? undefined}
                      className={cn(
                        "w-full text-left truncate rounded px-1 py-0.5 text-[11px] border",
                        tone,
                      )}
                    >
                      {r.icon} {r.title || "Untitled"}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {colorProp && (
        <Legend prop={colorProp} />
      )}
    </div>
  );
}

function Legend({ prop }: { prop: Property }) {
  if (!prop.options?.length) return null;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
      <span>Legend:</span>
      {prop.options.map(o => (
        <span key={o.id} className={cn("inline-flex items-center rounded-full border px-2 py-0.5", colorClass(o.color))}>
          {o.name}
        </span>
      ))}
    </div>
  );
}
