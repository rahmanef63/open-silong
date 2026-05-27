import { date, num, str, NULL_VALUE } from "../types";
import { toDate, toNumber, toString } from "../coerce";
import { addUnit, diffUnit, formatDate } from "../dateUtils";
import { need, type FnRegistry } from "./_registry";

/** Coerce arg → Date; null bubbles to NULL_VALUE numeric extraction (NaN). */
function dateOrNull(arg: ReturnType<typeof toDate>) {
  return arg ?? null;
}

export const dateFns: FnRegistry = {
  now: () => date(new Date().toISOString()),
  today: () => date(new Date().toISOString().slice(0, 10)),

  dateadd: (n, args) => {
    need(n, args, 3);
    const d = toDate(args[0]);
    if (!d) return NULL_VALUE;
    const inc = Math.floor(toNumber(args[1]));
    const unit = toString(args[2]).toLowerCase();
    return date(addUnit(d, inc, unit));
  },

  datesubtract: (n, args) => {
    need(n, args, 3);
    const d = toDate(args[0]);
    if (!d) return NULL_VALUE;
    const inc = -Math.floor(toNumber(args[1]));
    const unit = toString(args[2]).toLowerCase();
    return date(addUnit(d, inc, unit));
  },

  datebetween: (n, args) => {
    need(n, args, 3);
    const a = toDate(args[0]);
    const b = toDate(args[1]);
    if (!a || !b) return NULL_VALUE;
    const unit = toString(args[2]).toLowerCase();
    return num(diffUnit(a, b, unit));
  },

  formatdate: (n, args) => {
    need(n, args, 2);
    const d = toDate(args[0]);
    if (!d) return str("");
    return str(formatDate(d, toString(args[1])));
  },

  /** Local-time field extractors. Match Notion: year/month/day are
   *  1-based for month + day; hour/minute/second 0-based. */
  year: (n, args) => {
    need(n, args, 1);
    const d = dateOrNull(toDate(args[0]));
    return d ? num(d.getFullYear()) : NULL_VALUE;
  },
  month: (n, args) => {
    need(n, args, 1);
    const d = dateOrNull(toDate(args[0]));
    return d ? num(d.getMonth() + 1) : NULL_VALUE;
  },
  day: (n, args) => {
    need(n, args, 1);
    const d = dateOrNull(toDate(args[0]));
    return d ? num(d.getDate()) : NULL_VALUE;
  },
  hour: (n, args) => {
    need(n, args, 1);
    const d = dateOrNull(toDate(args[0]));
    return d ? num(d.getHours()) : NULL_VALUE;
  },
  minute: (n, args) => {
    need(n, args, 1);
    const d = dateOrNull(toDate(args[0]));
    return d ? num(d.getMinutes()) : NULL_VALUE;
  },
  second: (n, args) => {
    need(n, args, 1);
    const d = dateOrNull(toDate(args[0]));
    return d ? num(d.getSeconds()) : NULL_VALUE;
  },

  /** Epoch round-trip — useful in calendar / scheduler computations. */
  timestamp: (n, args) => {
    need(n, args, 1);
    const d = dateOrNull(toDate(args[0]));
    return d ? num(d.getTime()) : NULL_VALUE;
  },
  fromtimestamp: (n, args) => {
    need(n, args, 1);
    const ms = toNumber(args[0]);
    if (!Number.isFinite(ms)) return NULL_VALUE;
    return date(new Date(ms).toISOString());
  },
};
