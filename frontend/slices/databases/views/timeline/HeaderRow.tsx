import { cn } from "@/shared/lib/utils";

export function TimelineHeader({
  days, cellW, todayMs, todayPx, daysCount, labelW,
}: {
  days: Date[];
  cellW: number;
  todayMs: number;
  todayPx: number;
  daysCount: number;
  labelW: number;
}) {
  return (
    <div className="flex border-b border-border bg-muted/30">
      <div style={{ width: labelW }} className="shrink-0 text-[10px] text-muted-foreground px-2 py-1 border-r border-border">
        Name
      </div>
      <div className="relative flex" style={{ width: daysCount * cellW }}>
        {days.map((d, i) => {
          const isToday = d.getTime() === todayMs;
          const isWeekStart = d.getDay() === 0;
          return (
            <div
              key={i}
              style={{ width: cellW }}
              className={cn(
                "shrink-0 border-r border-border/50 px-0.5 py-1 text-[9px] text-center",
                isToday ? "bg-brand/10 text-brand font-bold" : "text-muted-foreground",
                isWeekStart && "border-r-border",
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
        {todayPx >= 0 && todayPx < daysCount * cellW && (
          <div
            className="absolute top-0 bottom-0 w-px bg-brand/60 pointer-events-none z-10"
            style={{ left: todayPx + cellW / 2 }}
          />
        )}
      </div>
    </div>
  );
}
