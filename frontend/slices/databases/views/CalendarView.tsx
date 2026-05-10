import { useMemo, useState } from "react";
import { Database, DatabaseViewConfig, Page, Property } from "@/shared/types/domain";
import { ChevronLeft, ChevronRight, Plus, MoreHorizontal, Trash2, AlertCircle } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { focusSiblingBySelector } from "@/shared/lib/keyboard";
import { colorClass } from "@/shared/lib/format";
import { useStore } from "@/shared/lib/store";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { QuickCreateDialog } from "../components/QuickCreateDialog";
import { DynamicIcon } from "@/slices/icon-picker";
import type { PropertyValue } from "@/shared/types/domain";
import {
  DndContext, useDraggable, useDroppable, PointerSensor, TouchSensor, useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import {
  computeDateShift, formatDateValue, parseDropTargetId, parseExistingDate,
} from "../lib/calendarDrag";

interface Props { db: Database; view: DatabaseViewConfig; rows: Page[]; onOpenRow: (id: string) => void }

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseYMD(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function startOfWeek(d: Date, weekStart: 0 | 1): Date {
  const out = new Date(d);
  const offset = (out.getDay() - weekStart + 7) % 7;
  out.setDate(out.getDate() - offset);
  out.setHours(0, 0, 0, 0);
  return out;
}

export function CalendarView({ db, view, rows, onOpenRow }: Props) {
  const { deleteRow, setRowValue } = useStore();
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickPrefill, setQuickPrefill] = useState<Record<string, PropertyValue>>({});

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
  const mode: "month" | "week" = view.calendarMode ?? "month";
  const showOverdue = view.calendarShowOverdue ?? true;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [weekAnchor, setWeekAnchor] = useState(() => startOfWeek(now, weekStart));

  const prev = () => {
    if (mode === "week") {
      const d = new Date(weekAnchor); d.setDate(d.getDate() - 7); setWeekAnchor(d);
    } else if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const next = () => {
    if (mode === "week") {
      const d = new Date(weekAnchor); d.setDate(d.getDate() + 7); setWeekAnchor(d);
    } else if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };
  const goToday = () => {
    setYear(now.getFullYear()); setMonth(now.getMonth());
    setWeekAnchor(startOfWeek(now, weekStart));
  };

  // Build cells for current view
  const cells: (Date | null)[] = useMemo(() => {
    if (mode === "week") {
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekAnchor);
        d.setDate(d.getDate() + i);
        return d;
      });
    }
    const first = new Date(year, month, 1);
    const startDay = (first.getDay() - weekStart + 7) % 7;
    const days = new Date(year, month + 1, 0).getDate();
    const out: (Date | null)[] = [];
    for (let i = 0; i < startDay; i++) out.push(null);
    for (let d = 1; d <= days; d++) out.push(new Date(year, month, d));
    return out;
  }, [mode, weekAnchor, year, month, weekStart]);

  const headerLabel = mode === "week"
    ? (() => {
        const end = new Date(weekAnchor); end.setDate(end.getDate() + 6);
        return `${weekAnchor.toLocaleString("default", { month: "short", day: "numeric" })} – ${end.toLocaleString("default", { month: "short", day: "numeric", year: "numeric" })}`;
      })()
    : new Date(year, month, 1).toLocaleString("default", { month: "long", year: "numeric" });

  // Map from YYYY-MM-DD → events
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

  // Overdue + no-date rows
  const undated = useMemo(() => {
    if (!dateProp) return [] as Page[];
    return rows.filter(r => {
      const v = (r.rowProps?.[dateProp.id] as any)?.date;
      return !v;
    });
  }, [rows, dateProp]);

  const overdue = useMemo(() => {
    if (!dateProp) return [] as Page[];
    return rows.filter(r => {
      const v = (r.rowProps?.[dateProp.id] as any)?.date;
      if (!v) return false;
      const d = parseYMD(v);
      return d && d < todayStart;
    });
  }, [rows, dateProp, todayStart]);

  const todayStr = ymd(now);
  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const orderedDays = [...dayLabels.slice(weekStart), ...dayLabels.slice(0, weekStart)];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    // Touch sensor with a 200ms long-press so taps still open the row.
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
  );

  const onDragEnd = (e: DragEndEvent) => {
    if (!dateProp) return;
    const { active, over } = e;
    if (!over) return;
    const targetDate = parseDropTargetId(String(over.id));
    if (!targetDate) return;
    const rowId = String(active.id);
    const row = rows.find((r) => r.id === rowId);
    if (!row) return;

    const startVal = row.rowProps?.[dateProp.id];
    const oldStart = parseExistingDate(startVal);
    const oldStartTime = (startVal && typeof startVal === "object" && "time" in startVal)
      ? (startVal as { time?: string }).time
      : undefined;

    const endVal = endProp ? row.rowProps?.[endProp.id] : undefined;
    const oldEnd = parseExistingDate(endVal);
    const oldEndTime = (endVal && typeof endVal === "object" && "time" in endVal)
      ? (endVal as { time?: string }).time
      : undefined;

    const shift = computeDateShift(oldStart, targetDate, oldEnd);
    setRowValue(db.id, rowId, dateProp.id, formatDateValue(shift.startYmd, oldStartTime));
    if (endProp && shift.endYmd && shift.endYmd !== oldEnd) {
      setRowValue(db.id, rowId, endProp.id, formatDateValue(shift.endYmd, oldEndTime));
    }
  };

  const isCurrentNav = mode === "week"
    ? (() => {
        const wAnchor = startOfWeek(now, weekStart);
        return ymd(weekAnchor) === ymd(wAnchor);
      })()
    : year === now.getFullYear() && month === now.getMonth();

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-1">
          <button onClick={prev} className="rounded p-1 hover:bg-accent text-muted-foreground">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={next} className="rounded p-1 hover:bg-accent text-muted-foreground">
            <ChevronRight className="h-4 w-4" />
          </button>
          {!isCurrentNav && (
            <button onClick={goToday} className="ml-1 rounded px-2 py-1 text-xs hover:bg-accent text-muted-foreground border border-border">
              Today
            </button>
          )}
          <ModeToggle db={db} view={view} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{headerLabel}</span>
          {!dateProp && (
            <span className="text-xs text-muted-foreground">(add a Date property)</span>
          )}
          <button
            onClick={() => {
              setQuickPrefill(dateProp ? { [dateProp.id]: { date: ymd(now) } } : {});
              setQuickOpen(true);
            }}
            className="ml-1 flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs hover:bg-accent text-muted-foreground"
          >
            <Plus className="h-3 w-3" /> New
          </button>
        </div>
      </div>

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className={cn(
          "grid gap-px bg-border rounded-md overflow-hidden text-xs",
          showWeekends ? "grid-cols-7" : "grid-cols-5",
        )}>
          {orderedDays.map((label, i) => {
            const isWeekend = (weekStart + i) % 7 === 0 || (weekStart + i) % 7 === 6;
            if (!showWeekends && isWeekend) return null;
            return (
              <div key={label} className="bg-muted/40 px-2 py-1 text-muted-foreground font-medium text-[10px] uppercase tracking-wider">{label}</div>
            );
          })}
          {cells.map((d, i) => {
            const dayOfWeek = d ? d.getDay() : null;
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            if (!showWeekends && isWeekend) return null;
            const key = d ? ymd(d) : `e${i}`;
            const items = d ? (rowsByDate.get(key) ?? []) : [];
            const isToday = key === todayStr;
            const onAddOnDay = () => {
              if (!dateProp || !d) return;
              setQuickPrefill({ [dateProp.id]: { date: key } });
              setQuickOpen(true);
            };
            return (
              <DayCell
                key={key}
                d={d}
                ymdKey={key}
                isToday={isToday}
                items={items}
                colorProp={colorProp}
                onOpenRow={onOpenRow}
                onDeleteRow={(id) => deleteRow(db.id, id)}
                onAddOnDay={onAddOnDay}
                hasDateProp={!!dateProp}
                weekMode={mode === "week"}
              />
            );
          })}
        </div>

        {showOverdue && (overdue.length > 0 || undated.length > 0) && (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {overdue.length > 0 && (
              <OverflowPanel
                title={`Overdue · ${overdue.length}`}
                tone="destructive"
                rows={overdue}
                onOpenRow={onOpenRow}
                onDeleteRow={(id) => deleteRow(db.id, id)}
              />
            )}
            {undated.length > 0 && (
              <OverflowPanel
                title={`No date · ${undated.length}`}
                tone="muted"
                rows={undated}
                onOpenRow={onOpenRow}
                onDeleteRow={(id) => deleteRow(db.id, id)}
              />
            )}
          </div>
        )}
      </DndContext>

      {colorProp && <Legend prop={colorProp} />}

      <QuickCreateDialog
        db={db}
        view={view}
        open={quickOpen}
        onOpenChange={setQuickOpen}
        prefill={quickPrefill}
        title="Add to calendar"
        onCreated={(id) => onOpenRow(id)}
      />
    </div>
  );
}

function ModeToggle({ db, view }: { db: Database; view: DatabaseViewConfig }) {
  const { updateView } = useStore();
  const mode = view.calendarMode ?? "month";
  return (
    <div className="ml-1 inline-flex rounded-md border border-border bg-card p-0.5 text-[11px]">
      {(["month", "week"] as const).map(m => (
        <button
          key={m}
          onClick={() => updateView(db.id, view.id, { calendarMode: m })}
          className={cn(
            "rounded px-2 py-0.5 transition",
            mode === m ? "bg-brand text-white font-medium" : "text-muted-foreground hover:bg-accent"
          )}
        >{m === "week" ? "Week" : "Month"}</button>
      ))}
    </div>
  );
}

function DayCell({
  d, ymdKey, isToday, items, colorProp, onOpenRow, onDeleteRow, onAddOnDay, hasDateProp, weekMode,
}: {
  d: Date | null;
  ymdKey: string;
  isToday: boolean;
  items: Page[];
  colorProp: Property | undefined;
  onOpenRow: (id: string) => void;
  onDeleteRow: (id: string) => void;
  onAddOnDay: () => void;
  hasDateProp: boolean;
  weekMode: boolean;
}) {
  const droppableId = d ? `cal-day:${ymdKey}` : `cal-empty:${ymdKey}`;
  const { setNodeRef, isOver } = useDroppable({ id: droppableId, disabled: !d || !hasDateProp });
  return (
    <div
      ref={setNodeRef}
      onClick={(e) => {
        if (!d || !hasDateProp) return;
        if (e.target !== e.currentTarget) return;
        onAddOnDay();
      }}
      className={cn(
        "bg-card p-1.5 group relative",
        weekMode ? "min-h-[200px]" : "min-h-20 sm:min-h-24",
        isToday && "bg-brand/5",
        isOver && "ring-2 ring-brand bg-brand/10",
        d && hasDateProp && "cursor-copy hover:bg-accent/30",
      )}
    >
      {d && (
        <div className="flex items-center justify-between mb-1">
          <div className={cn(
            "text-[10px] w-5 h-5 flex items-center justify-center rounded-full",
            isToday ? "bg-brand text-white font-bold" : "text-muted-foreground"
          )}>
            {d.getDate()}
          </div>
          {hasDateProp && (
            <button
              onClick={(e) => { e.stopPropagation(); onAddOnDay(); }}
              title="Add row on this date"
              className="rounded p-0.5 text-muted-foreground/30 hover:text-foreground hover:bg-accent transition opacity-60 group-hover:opacity-100"
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
            <DraggableEvent
              key={r.id}
              row={r}
              tone={tone}
              colorOptName={colorOpt?.name}
              onOpenRow={onOpenRow}
              onDeleteRow={onDeleteRow}
            />
          );
        })}
      </div>
    </div>
  );
}

function DraggableEvent({
  row, tone, colorOptName, onOpenRow, onDeleteRow,
}: {
  row: Page; tone: string; colorOptName?: string;
  onOpenRow: (id: string) => void; onDeleteRow: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: row.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined }}
      className={cn("relative group/event", isDragging && "opacity-40")}
    >
      <button
        {...attributes} {...listeners}
        onClick={() => onOpenRow(row.id)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "ArrowLeft" || e.key === "ArrowRight") {
            e.preventDefault();
            const delta = e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 1;
            focusSiblingBySelector(e.currentTarget, "[data-db-nav-item]", delta as 1 | -1);
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          if (window.confirm(`Delete "${row.title || "Untitled"}"?`)) onDeleteRow(row.id);
        }}
        data-db-nav-item
        title={colorOptName ?? "Click to open · Drag to change date · Right-click to delete"}
        className={cn(
          "w-full text-left truncate rounded px-1 py-0.5 text-[11px] border pr-5 cursor-grab active:cursor-grabbing touch-none",
          tone,
        )}
      >
        <DynamicIcon value={row.icon} className="text-[11px] mr-1 inline-flex" />{row.title || "Untitled"}
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            onClick={(e) => e.stopPropagation()}
            className="absolute top-0.5 right-0.5 opacity-0 group-hover/event:opacity-100 rounded p-0.5 hover:bg-background/60 text-current"
            aria-label="Event actions"
          >
            <MoreHorizontal className="h-3 w-3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onOpenRow(row.id)}>Open</DropdownMenuItem>
          <DropdownMenuItem className="text-destructive" onClick={() => onDeleteRow(row.id)}>
            <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function OverflowPanel({
  title, rows, tone, onOpenRow, onDeleteRow,
}: {
  title: string;
  rows: Page[];
  tone: "destructive" | "muted";
  onOpenRow: (id: string) => void;
  onDeleteRow: (id: string) => void;
}) {
  const headerCls = tone === "destructive"
    ? "text-destructive bg-destructive/10 border-destructive/30"
    : "text-muted-foreground bg-muted/40 border-border";
  return (
    <div className="rounded-md border border-border bg-card overflow-hidden">
      <div className={cn("flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border-b", headerCls)}>
        {tone === "destructive" && <AlertCircle className="h-3.5 w-3.5" />}
        {title}
      </div>
      <div className="divide-y divide-border max-h-40 overflow-y-auto">
        {rows.map(r => (
          <div key={r.id} className="flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent/40 group">
            <button onClick={() => onOpenRow(r.id)} className="flex-1 text-left truncate">
<DynamicIcon value={r.icon} className="text-xs mr-1 inline-flex" />{r.title || "Untitled"}
            </button>
            <button
              onClick={() => onDeleteRow(r.id)}
              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
              aria-label="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
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
