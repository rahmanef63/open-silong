/** Pure helpers for calendar drag-to-move. Date shape on the wire is
 *  the same `{ date: "YYYY-MM-DD", time?: string }` envelope used
 *  everywhere else. */

const DAY_MS = 86_400_000;

export interface DateValue { date?: string; time?: string }

/** Read the YYYY-MM-DD prefix from an arbitrary rowProps date entry. */
export function parseExistingDate(v: unknown): string | null {
  if (!v || typeof v !== "object") return null;
  const s = (v as { date?: unknown }).date;
  if (typeof s !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

/** Build the value envelope that goes back into rowProps. Preserves the
 *  optional `time` field so a dragged event keeps its original time. */
export function formatDateValue(ymd: string, time?: string): DateValue {
  return time ? { date: ymd, time } : { date: ymd };
}

/** Add `days` to a YYYY-MM-DD and return the same shape. */
export function shiftYmd(ymd: string, days: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd);
  if (!m) return ymd;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export interface ShiftResult {
  startYmd: string;
  /** Only set when the event has an end-date and the start moved. */
  endYmd: string | null;
}

/** Given a drop on `targetYmd`, compute the new start and the
 *  shifted end (if the event was a range). End shifts by the same delta
 *  so the duration is preserved. Returns endYmd=null when the row had
 *  no end. */
export function computeDateShift(
  oldStartYmd: string | null,
  targetYmd: string,
  oldEndYmd: string | null,
): ShiftResult {
  if (!oldStartYmd || !oldEndYmd) {
    return { startYmd: targetYmd, endYmd: null };
  }
  const oldStart = parseYmdInternal(oldStartYmd);
  const target = parseYmdInternal(targetYmd);
  if (!oldStart || !target) return { startYmd: targetYmd, endYmd: null };
  const deltaDays = Math.round((target.getTime() - oldStart.getTime()) / DAY_MS);
  if (deltaDays === 0) return { startYmd: targetYmd, endYmd: oldEndYmd };
  return { startYmd: targetYmd, endYmd: shiftYmd(oldEndYmd, deltaDays) };
}

/** Strict drop-target id check — calendar emits `cal-day:YYYY-MM-DD`. */
export function parseDropTargetId(id: string): string | null {
  if (!id.startsWith("cal-day:")) return null;
  const ymd = id.slice("cal-day:".length);
  return /^\d{4}-\d{2}-\d{2}$/.test(ymd) ? ymd : null;
}

function parseYmdInternal(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}
