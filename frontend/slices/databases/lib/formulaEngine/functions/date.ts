import { date, num, str, NULL_VALUE } from "../types";
import { toDate, toNumber, toString } from "../coerce";
import { addUnit, diffUnit, formatDate } from "../dateUtils";
import { need, type FnRegistry, type FnSignatureMap } from "./_registry";

export const dateSigs: FnSignatureMap = {
  now:           { args: [],                              returns: "date",   group: "date", desc: "Current timestamp" },
  today:         { args: [],                              returns: "date",   group: "date", desc: "Today's date (no time)" },
  dateAdd:       { args: ["d", "n", "unit"],              returns: "date",   group: "date", desc: 'Add n units to d (unit: "day"|"month"|"year"|...)' },
  dateSubtract:  { args: ["d", "n", "unit"],              returns: "date",   group: "date", desc: "Subtract n units from d" },
  dateBetween:   { args: ["a", "b", "unit"],              returns: "number", group: "date", desc: "Distance a→b in unit" },
  formatDate:    { args: ["d", "pattern"],                returns: "string", group: "date", desc: 'Format d via tokens like "YYYY-MM-DD"' },
  year:          { args: ["d"],                           returns: "number", group: "date", desc: "Year of d" },
  month:         { args: ["d"],                           returns: "number", group: "date", desc: "Month of d (1–12)" },
  day:           { args: ["d"],                           returns: "number", group: "date", desc: "Day of month (1–31)" },
  hour:          { args: ["d"],                           returns: "number", group: "date", desc: "Hour (0–23)" },
  minute:        { args: ["d"],                           returns: "number", group: "date", desc: "Minute (0–59)" },
  second:        { args: ["d"],                           returns: "number", group: "date", desc: "Second (0–59)" },
  timestamp:     { args: ["d"],                           returns: "number", group: "date", desc: "Epoch ms" },
  fromTimestamp: { args: ["ms"],                          returns: "date",   group: "date", desc: "Date from epoch ms" },
};

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
