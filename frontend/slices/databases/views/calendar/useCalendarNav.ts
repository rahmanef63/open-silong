import { useMemo, useState } from "react";
import { startOfWeek, ymd } from "./dateUtils";

export function useCalendarNav(mode: "month" | "week", weekStart: 0 | 1) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [weekAnchor, setWeekAnchor] = useState(() => startOfWeek(now, weekStart));

  const prev = () => {
    if (mode === "week") {
      const d = new Date(weekAnchor); d.setDate(d.getDate() - 7); setWeekAnchor(d);
    } else if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };
  const next = () => {
    if (mode === "week") {
      const d = new Date(weekAnchor); d.setDate(d.getDate() + 7); setWeekAnchor(d);
    } else if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };
  const goToday = () => {
    setYear(now.getFullYear()); setMonth(now.getMonth());
    setWeekAnchor(startOfWeek(now, weekStart));
  };

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

  const isCurrentNav = mode === "week"
    ? ymd(weekAnchor) === ymd(startOfWeek(now, weekStart))
    : year === now.getFullYear() && month === now.getMonth();

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return { now, todayStart, year, month, weekAnchor, prev, next, goToday, cells, headerLabel, isCurrentNav };
}
