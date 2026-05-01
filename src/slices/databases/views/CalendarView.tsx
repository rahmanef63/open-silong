import { useState } from "react";
import { Database, DatabaseViewConfig, Page } from "@/shared/types/domain";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { focusSiblingBySelector } from "@/shared/lib/keyboard";

interface Props { db: Database; view: DatabaseViewConfig; rows: Page[]; onOpenRow: (id: string) => void }

export function CalendarView({ db, rows, onOpenRow }: Props) {
  const dateProp = db.properties.find(p => p.type === "date");

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const prev = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const next = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };
  const goToday = () => { setYear(now.getFullYear()); setMonth(now.getMonth()); };

  const first = new Date(year, month, 1);
  const startDay = first.getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(new Date(year, month, d));

  const rowsByDate = new Map<string, Page[]>();
  if (dateProp) {
    for (const r of rows) {
      const v = (r.rowProps?.[dateProp.id] as any)?.date;
      if (!v) continue;
      const arr = rowsByDate.get(v) ?? [];
      arr.push(r);
      rowsByDate.set(v, arr);
    }
  }

  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  return (
    <div className="p-3">
      {/* Header: nav + month label */}
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

      <div className="grid grid-cols-7 gap-px bg-border rounded-md overflow-hidden text-xs">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
          <div key={d} className="bg-muted/40 px-2 py-1 text-muted-foreground font-medium text-[10px] uppercase tracking-wider">{d}</div>
        ))}
        {cells.map((d, i) => {
          const key = d
            ? `${year}-${String(month + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
            : `e${i}`;
          const items = d ? (rowsByDate.get(key) ?? []) : [];
          const isToday = key === todayStr;
          return (
            <div key={key} className={cn("bg-card min-h-20 p-1.5", isToday && "bg-brand/5")}>
              {d && (
                <div className={cn(
                  "text-[10px] mb-1 w-5 h-5 flex items-center justify-center rounded-full",
                  isToday ? "bg-brand text-white font-bold" : "text-muted-foreground"
                )}>
                  {d.getDate()}
                </div>
              )}
              <div className="space-y-0.5">
                {items.map(r => (
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
                    className="w-full text-left truncate rounded bg-brand/15 text-brand px-1 py-0.5 hover:bg-brand/25 text-[11px]"
                  >
                    {r.icon} {r.title || "Untitled"}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
