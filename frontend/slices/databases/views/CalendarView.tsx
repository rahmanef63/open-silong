import { useState } from "react";
import { Database, DatabaseViewConfig, Page } from "@/shared/types/domain";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useDbAdapter } from "../lib/useDbAdapter";
import { Button } from "@/shared/ui/button";
import { QuickCreateDialog } from "../components/QuickCreateDialog";
import type { PropertyValue } from "@/shared/types/domain";
import {
  DndContext, PointerSensor, TouchSensor, useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import {
  computeDateShift, formatDateValue, parseDropTargetId, parseExistingDate,
} from "../lib/calendarDrag";
import { ymd } from "./calendar/dateUtils";
import { useCalendarProps, useRowsByDate, useOverdueAndUndated } from "./calendar/useCalendarData";
import { useCalendarNav } from "./calendar/useCalendarNav";
import { DayCell } from "./calendar/DayCell";
import { ModeToggle, OverflowPanel, Legend } from "./calendar/sidePanels";

interface Props { db: Database; view: DatabaseViewConfig; rows: Page[]; onOpenRow: (id: string) => void }

export function CalendarView({ db, view, rows, onOpenRow }: Props) {
  const { deleteRow, setRowValue } = useDbAdapter();
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickPrefill, setQuickPrefill] = useState<Record<string, PropertyValue>>({});

  const { dateProp, endProp, colorProp } = useCalendarProps(db, view);

  const weekStart = view.calendarWeekStart ?? 0;
  const showWeekends = view.calendarShowWeekends ?? true;
  const mode: "month" | "week" = view.calendarMode ?? "month";
  const showOverdue = view.calendarShowOverdue ?? true;

  const nav = useCalendarNav(mode, weekStart);

  const rowsByDate = useRowsByDate(rows, dateProp, endProp);
  const { undated, overdue } = useOverdueAndUndated(rows, dateProp, nav.todayStart);

  const todayStr = ymd(nav.now);
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

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-1">
          <Button variant="ghost" onClick={nav.prev} className="h-auto rounded p-1 text-muted-foreground [&_svg]:size-4">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" onClick={nav.next} className="h-auto rounded p-1 text-muted-foreground [&_svg]:size-4">
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!nav.isCurrentNav && (
            <Button variant="outline" onClick={nav.goToday} className="ml-1 h-auto rounded px-2 py-1 text-xs font-normal text-muted-foreground">
              Today
            </Button>
          )}
          <ModeToggle db={db} view={view} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{nav.headerLabel}</span>
          {!dateProp && (
            <span className="text-xs text-muted-foreground">(add a Date property)</span>
          )}
          <Button
            variant="outline"
            onClick={() => {
              setQuickPrefill(dateProp ? { [dateProp.id]: { date: ymd(nav.now) } } : {});
              setQuickOpen(true);
            }}
            className="ml-1 h-auto gap-1 rounded-md bg-card px-2 py-1 text-xs font-normal text-muted-foreground [&_svg]:size-3"
          >
            <Plus className="h-3 w-3" /> New
          </Button>
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
          {nav.cells.map((d, i) => {
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
