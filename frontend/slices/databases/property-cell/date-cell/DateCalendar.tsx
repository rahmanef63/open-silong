"use client";

/** DateCalendar — a self-contained month grid for the date cell.
 *
 *  Deliberately does NOT use react-day-picker: under rdp v10 the
 *  mode/selected/onSelect path silently stopped registering day clicks (same
 *  bug in notion-page-clone). Here every day is a plain shadcn <Button> with a
 *  direct onClick, so picking always works. Selected / range / today are pure
 *  className state we own. */

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const firstOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const sameDay = (a?: Date, b?: Date) =>
  !!a && !!b &&
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

interface Props {
  selected?: Date;
  rangeStart?: Date;
  rangeEnd?: Date;
  defaultMonth?: Date;
  onPick: (d: Date) => void;
}

export function DateCalendar({ selected, rangeStart, rangeEnd, defaultMonth, onPick }: Props) {
  const [view, setView] = useState<Date>(firstOfMonth(defaultMonth ?? selected ?? new Date()));
  const year = view.getFullYear();
  const month = view.getMonth();
  const lead = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const inRange = (d: Date) => !!rangeStart && !!rangeEnd && d > rangeStart && d < rangeEnd;
  const isEdge = (d: Date) => sameDay(d, rangeStart) || sameDay(d, rangeEnd);
  const isOn = (d: Date) => sameDay(d, selected) || isEdge(d);

  return (
    <div className="w-[16rem] p-2">
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-sm font-medium">
          {view.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </span>
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground"
            onClick={() => setView(firstOfMonth(new Date()))}>
            Today
          </Button>
          <Button variant="ghost" size="icon" className="size-7" aria-label="Previous month"
            onClick={() => setView(new Date(year, month - 1, 1))}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" className="size-7" aria-label="Next month"
            onClick={() => setView(new Date(year, month + 1, 1))}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 text-center text-[11px] text-muted-foreground">
        {WEEKDAYS.map((w) => <div key={w} className="py-1">{w}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((d, i) =>
          d ? (
            <Button
              key={i}
              variant="ghost"
              type="button"
              onClick={() => onPick(d)}
              className={cn(
                "size-8 p-0 text-sm font-normal",
                inRange(d) && "rounded-none bg-accent/60",
                sameDay(d, today) && !isOn(d) && "ring-1 ring-border",
                isOn(d) && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
              )}
            >
              {d.getDate()}
            </Button>
          ) : (
            <div key={i} className="size-8" />
          ),
        )}
      </div>
    </div>
  );
}
