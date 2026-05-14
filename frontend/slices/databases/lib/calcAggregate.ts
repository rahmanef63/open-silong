/** Per-column aggregate computation + valid-aggregate mapping.
 *
 *  Notion-canonical "Calculate" set per property type. Keep this in
 *  sync with `shared.calculateOptions` in the property reference.
 */

import type { CalcKind, Page, Property, PropertyValue } from "@/shared/types/domain";
import { formatDateLong as fmtDate } from "../../../shared/lib/format";

const COMMON: CalcKind[] = [
  "count_all", "count_values", "count_unique_values",
  "count_empty", "count_not_empty",
  "percent_empty", "percent_not_empty",
];

const CALC_LABELS: Record<CalcKind, string> = {
  none: "None",
  count_all: "Count all",
  count_values: "Count values",
  count_unique_values: "Count unique",
  count_empty: "Count empty",
  count_not_empty: "Count not empty",
  percent_empty: "% empty",
  percent_not_empty: "% not empty",
  sum: "Sum", average: "Average", median: "Median",
  min: "Min", max: "Max", range: "Range",
  checked: "Checked", unchecked: "Unchecked",
  percent_checked: "% checked", percent_unchecked: "% unchecked",
  earliest_date: "Earliest", latest_date: "Latest", date_range: "Date range",
};

/** Aggregates valid for the given property type. */
export function validCalcs(prop: Property): CalcKind[] {
  switch (prop.type) {
    case "number":
      return [...COMMON, "sum", "average", "median", "min", "max", "range"];
    case "checkbox":
      return ["count_all", "count_values", "checked", "unchecked", "percent_checked", "percent_unchecked"];
    case "date":
    case "created_time":
    case "last_edited_time":
      return [...COMMON, "earliest_date", "latest_date", "date_range"];
    case "files":
      return ["count_all", "count_values", "count_empty", "count_not_empty", "percent_empty", "percent_not_empty"];
    case "button":
      return [];
    case "place":
    case "url": case "email": case "phone":
      return [...COMMON];
    case "verification":
      return ["count_all", "count_values", "checked", "unchecked", "percent_checked", "percent_unchecked"];
    default:
      return COMMON;
  }
}

export function calcLabel(c: CalcKind): string {
  return CALC_LABELS[c];
}

const isEmpty = (v: PropertyValue | undefined): boolean => {
  if (v === null || v === undefined) return true;
  if (typeof v === "string") return v.length === 0;
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === "object" && "date" in v) return !v.date;
  if (typeof v === "object" && "verified" in v) return false;
  return false;
};

/** Coerce raw checkbox value or verification object → boolean. */
const toBool = (v: PropertyValue | undefined): boolean | null => {
  if (v === true || v === false) return v;
  if (typeof v === "object" && v && "verified" in v) return !!v.verified;
  return null;
};

const toNumber = (v: PropertyValue | undefined): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

const toDate = (v: PropertyValue | undefined): number | null => {
  if (typeof v === "string") {
    const t = Date.parse(v);
    return Number.isNaN(t) ? null : t;
  }
  if (typeof v === "object" && v && "date" in v && v.date) {
    const t = Date.parse(v.date);
    return Number.isNaN(t) ? null : t;
  }
  return null;
};

/** Compute the aggregate display string. Returns "" when not
 *  applicable / no data. */
export function computeCalc(rows: Page[], prop: Property, calc: CalcKind): string {
  if (calc === "none") return "";
  const values = rows.map((r) => r.rowProps?.[prop.id]);
  const total = values.length;
  const filled = values.filter((v) => !isEmpty(v));
  const filledCount = filled.length;
  const empty = total - filledCount;

  switch (calc) {
    case "count_all": return String(total);
    case "count_values": return String(filledCount);
    case "count_unique_values": {
      const set = new Set<string>();
      for (const v of filled) set.add(JSON.stringify(v));
      return String(set.size);
    }
    case "count_empty": return String(empty);
    case "count_not_empty": return String(filledCount);
    case "percent_empty": return total ? `${Math.round((empty / total) * 100)}%` : "";
    case "percent_not_empty": return total ? `${Math.round((filledCount / total) * 100)}%` : "";

    case "sum":
    case "average":
    case "median":
    case "min":
    case "max":
    case "range": {
      const nums = filled.map(toNumber).filter((n): n is number => n !== null);
      if (!nums.length) return "—";
      switch (calc) {
        case "sum": return String(nums.reduce((a, b) => a + b, 0));
        case "average": {
          const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
          return avg.toFixed(2);
        }
        case "median": {
          const sorted = nums.slice().sort((a, b) => a - b);
          const mid = Math.floor(sorted.length / 2);
          return sorted.length % 2 ? String(sorted[mid]) : String((sorted[mid - 1] + sorted[mid]) / 2);
        }
        case "min": return String(Math.min(...nums));
        case "max": return String(Math.max(...nums));
        case "range": return String(Math.max(...nums) - Math.min(...nums));
      }
      return "";
    }

    case "checked": return String(filled.filter((v) => toBool(v) === true).length);
    case "unchecked": return String(filled.filter((v) => toBool(v) === false).length + empty);
    case "percent_checked": {
      const c = filled.filter((v) => toBool(v) === true).length;
      return total ? `${Math.round((c / total) * 100)}%` : "";
    }
    case "percent_unchecked": {
      const u = filled.filter((v) => toBool(v) === false).length + empty;
      return total ? `${Math.round((u / total) * 100)}%` : "";
    }

    case "earliest_date":
    case "latest_date":
    case "date_range": {
      const ts = filled.map(toDate).filter((t): t is number => t !== null);
      if (!ts.length) return "—";
      const min = Math.min(...ts), max = Math.max(...ts);
      if (calc === "earliest_date") return fmtDate(min);
      if (calc === "latest_date") return fmtDate(max);
      // date_range — days between
      const days = Math.round((max - min) / (24 * 60 * 60 * 1000));
      return `${days} day${days === 1 ? "" : "s"}`;
    }
  }
  return "";
}
