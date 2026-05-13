import { useMemo } from "react";
import type { Database, DatabaseViewConfig, Page } from "@/shared/types/domain";
import { parseYMD, ymd } from "./dateUtils";

export function useCalendarProps(db: Database, view: DatabaseViewConfig) {
  const dateProp = useMemo(
    () => db.properties.find((p) => p.id === view.calendarDateProp && p.type === "date")
      ?? db.properties.find((p) => p.type === "date"),
    [db.properties, view.calendarDateProp],
  );
  const endProp = useMemo(
    () => db.properties.find((p) => p.id === view.calendarEndProp && p.type === "date"),
    [db.properties, view.calendarEndProp],
  );
  const colorProp = useMemo(
    () => db.properties.find((p) => p.id === view.calendarColorByProp && (p.type === "select" || p.type === "status")),
    [db.properties, view.calendarColorByProp],
  );
  return { dateProp, endProp, colorProp };
}

export function useRowsByDate(rows: Page[], dateProp: ReturnType<typeof useCalendarProps>["dateProp"], endProp: ReturnType<typeof useCalendarProps>["endProp"]) {
  return useMemo(() => {
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
}

export function useOverdueAndUndated(rows: Page[], dateProp: ReturnType<typeof useCalendarProps>["dateProp"], todayStart: Date) {
  const undated = useMemo(() => {
    if (!dateProp) return [] as Page[];
    return rows.filter((r) => {
      const v = (r.rowProps?.[dateProp.id] as any)?.date;
      return !v;
    });
  }, [rows, dateProp]);

  const overdue = useMemo(() => {
    if (!dateProp) return [] as Page[];
    return rows.filter((r) => {
      const v = (r.rowProps?.[dateProp.id] as any)?.date;
      if (!v) return false;
      const d = parseYMD(v);
      return d && d < todayStart;
    });
  }, [rows, dateProp, todayStart]);

  return { undated, overdue };
}
