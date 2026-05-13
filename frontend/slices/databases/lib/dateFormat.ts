import type { Property } from "@/shared/types/domain";

export type DateFormatKind = NonNullable<Property["dateFormat"]>;
export type TimeFormatKind = NonNullable<Property["timeFormat"]>;
export type DateValue = { date?: string; end?: string; time?: string; endTime?: string };

const FORMATS: Record<DateFormatKind, string> = {
  full: "full",
  short: "short",
  mdy: "mdy",
  dmy: "dmy",
  ymd: "ymd",
  relative: "relative",
};

/** Parse YYYY-MM-DD (or YYYY-MM-DDTHH:mm) into a local Date. Returns null on bad input. */
export function parseYmdToLocal(ymd: string, hm?: string): Date | null {
  const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const [, y, mo, d] = m;
  let hour = 0, min = 0;
  if (hm) {
    const tm = hm.match(/^(\d{2}):(\d{2})$/);
    if (tm) { hour = +tm[1]; min = +tm[2]; }
  }
  return new Date(+y, +mo - 1, +d, hour, min, 0, 0);
}

function pad2(n: number) { return n < 10 ? `0${n}` : `${n}`; }

export function formatDate(ymd: string, fmt: DateFormatKind = "full"): string {
  const dt = parseYmdToLocal(ymd);
  if (!dt) return ymd;
  const y = dt.getFullYear(), mo = dt.getMonth() + 1, d = dt.getDate();
  if (fmt === "mdy") return `${mo}/${d}/${y}`;
  if (fmt === "dmy") return `${d}/${mo}/${y}`;
  if (fmt === "ymd") return `${y}/${pad2(mo)}/${pad2(d)}`;
  if (fmt === "short") return dt.toLocaleDateString(undefined, { month: "numeric", day: "numeric", year: "2-digit" });
  if (fmt === "relative") return formatRelative(dt);
  return dt.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

export function formatTime(hm: string, fmt: TimeFormatKind = "12h"): string {
  const m = hm.match(/^(\d{2}):(\d{2})$/);
  if (!m) return hm;
  const h = +m[1], mi = +m[2];
  if (fmt === "24h") return `${pad2(h)}:${pad2(mi)}`;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${pad2(mi)} ${period}`;
}

/** Combined display: "Wed, May 13, 2026 3:45 PM → 5:30 PM" etc. */
export function formatDateValue(v: DateValue, prop?: Pick<Property, "dateFormat" | "timeFormat" | "dateIncludeTime">): string {
  const fmt = prop?.dateFormat ?? "full";
  const tfmt = prop?.timeFormat ?? "12h";
  const showTime = !!prop?.dateIncludeTime;
  if (!v.date) return "";
  const parts: string[] = [formatDate(v.date, fmt)];
  if (showTime && v.time) parts.push(formatTime(v.time, tfmt));
  let out = parts.join(" ");
  if (v.end) {
    const endParts: string[] = [formatDate(v.end, fmt)];
    if (showTime && v.endTime) endParts.push(formatTime(v.endTime, tfmt));
    out += " → " + endParts.join(" ");
  } else if (showTime && v.endTime) {
    out += " → " + formatTime(v.endTime, tfmt);
  }
  return out;
}

function formatRelative(dt: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === -1) return "Yesterday";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays > 1 && diffDays < 7) return `In ${diffDays} days`;
  if (diffDays < -1 && diffDays > -7) return `${-diffDays} days ago`;
  return dt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export const DATE_FORMAT_LABELS: Record<DateFormatKind, string> = {
  full: "Full date",
  short: "Short date",
  mdy: "Month/Day/Year",
  dmy: "Day/Month/Year",
  ymd: "Year/Month/Day",
  relative: "Relative",
};
export const TIME_FORMAT_LABELS: Record<TimeFormatKind, string> = {
  "12h": "12 hour",
  "24h": "24 hour",
};
export const NOTIFICATION_LABELS: Record<NonNullable<Property["dateNotification"]>, string> = {
  none: "None",
  at_time: "At time of event",
  "5m": "5 minutes before",
  "10m": "10 minutes before",
  "30m": "30 minutes before",
  "1h": "1 hour before",
  "1d": "1 day before",
  "2d": "2 days before",
};
export const DATE_FORMATS = Object.keys(FORMATS) as DateFormatKind[];
