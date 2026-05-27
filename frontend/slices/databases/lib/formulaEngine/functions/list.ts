import { bool, list, num, str, NULL_VALUE, type FormulaValue } from "../types";
import { isEmpty, toNumber, toString } from "../coerce";
import { need, type FnRegistry, type FnSignatureMap } from "./_registry";

export const listSigs: FnSignatureMap = {
  count:    { args: ["value"],            returns: "number",  group: "list", desc: "List length or 0/1 for scalar" },
  sum:      { args: ["list"],             returns: "number",  group: "list", desc: "Sum of numeric list items" },
  prod:     { args: ["list"],             returns: "number",  group: "list", desc: "Product of numeric list items" },
  mean:     { args: ["list"],             returns: "number",  group: "list", desc: "Arithmetic mean" },
  avg:      { args: ["list"],             returns: "number",  group: "list", desc: "Alias of mean" },
  join:     { args: ["list", "sep?"],     returns: "string",  group: "list", desc: 'Join list items (default sep ", ")' },
  length:   { args: ["value"],            returns: "number",  group: "list", desc: "Length of string or list" },
  slice:    { args: ["value", "start", "end?"], returns: "any", group: "list", desc: "Slice string or list" },
  reverse:  { args: ["value"],            returns: "any",     group: "list", desc: "Reverse string or list" },
  first:    { args: ["list"],             returns: "any",     group: "list", desc: "First element" },
  last:     { args: ["list"],             returns: "any",     group: "list", desc: "Last element" },
  at:       { args: ["list", "i"],        returns: "any",     group: "list", desc: "Element at index i (negative ok)" },
  includes: { args: ["list", "value"],    returns: "boolean", group: "list", desc: "True if list contains value" },
  unique:   { args: ["list"],             returns: "list",    group: "list", desc: "Drop duplicates" },
};

/** Same-kind scalar equality — list `includes` + `indexOf` use this so a
 *  number list doesn't match a stringified search term. Mirrors the
 *  evaluator's formulaEqual helper without the list-recursion case. */
function scalarEq(a: FormulaValue, b: FormulaValue): boolean {
  if (a.kind === "null" && b.kind === "null") return true;
  if (a.kind === "null" || b.kind === "null") return false;
  if (a.kind !== b.kind) return false;
  return (a as { value: unknown }).value === (b as { value: unknown }).value;
}

export const listFns: FnRegistry = {
  count: (n, args) => {
    need(n, args, 1);
    if (args[0].kind === "list") return num(args[0].value.length);
    if (isEmpty(args[0])) return num(0);
    return num(1);
  },

  sum: (n, args) => {
    need(n, args, 1);
    if (args[0].kind === "list") {
      return num(args[0].value.map(toNumber).filter(Number.isFinite).reduce((a, b) => a + b, 0));
    }
    return num(toNumber(args[0]));
  },

  prod: (n, args) => {
    need(n, args, 1);
    const xs = args[0].kind === "list"
      ? args[0].value.map(toNumber).filter(Number.isFinite)
      : [toNumber(args[0])];
    return num(xs.length ? xs.reduce((a, b) => a * b, 1) : NaN);
  },

  mean: (n, args) => {
    need(n, args, 1);
    const xs = args[0].kind === "list"
      ? args[0].value.map(toNumber).filter(Number.isFinite)
      : [toNumber(args[0])];
    return num(xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
  },

  /** Avg — alias for mean (Notion exposes both names). */
  avg: (n, args) => {
    need(n, args, 1);
    const xs = args[0].kind === "list"
      ? args[0].value.map(toNumber).filter(Number.isFinite)
      : [toNumber(args[0])];
    return num(xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
  },

  join: (n, args) => {
    need(n, args, 1);
    const sep = toString(args[1] ?? str(", "));
    if (args[0].kind === "list") return str(args[0].value.map(toString).join(sep));
    return str(toString(args[0]));
  },

  /** Polymorphic — string OR list. List wins when first arg is list. */
  length: (n, args) => {
    need(n, args, 1);
    if (args[0].kind === "list") return num(args[0].value.length);
    return num(toString(args[0]).length);
  },

  /** Polymorphic slice(start) / slice(start, end) — works on strings + lists.
   *  Notion semantics: end is exclusive, negative indices count from end. */
  slice: (n, args) => {
    need(n, args, 2);
    const start = Math.floor(toNumber(args[1]));
    const end = args.length >= 3 ? Math.floor(toNumber(args[2])) : undefined;
    if (args[0].kind === "list") {
      return list(end === undefined ? args[0].value.slice(start) : args[0].value.slice(start, end));
    }
    const s = toString(args[0]);
    return str(end === undefined ? s.slice(start) : s.slice(start, end));
  },

  /** Polymorphic reverse — string OR list. */
  reverse: (n, args) => {
    need(n, args, 1);
    if (args[0].kind === "list") return list([...args[0].value].reverse());
    return str(toString(args[0]).split("").reverse().join(""));
  },

  first: (n, args) => {
    need(n, args, 1);
    if (args[0].kind !== "list") return args[0];
    return args[0].value[0] ?? NULL_VALUE;
  },

  last: (n, args) => {
    need(n, args, 1);
    if (args[0].kind !== "list") return args[0];
    const v = args[0].value;
    return v[v.length - 1] ?? NULL_VALUE;
  },

  at: (n, args) => {
    need(n, args, 2);
    const i = Math.floor(toNumber(args[1]));
    if (args[0].kind !== "list") return NULL_VALUE;
    const v = args[0].value;
    // Negative indices count from end (matches Array.prototype.at semantics).
    const idx = i < 0 ? v.length + i : i;
    return v[idx] ?? NULL_VALUE;
  },

  /** List-only inclusion. String-flavoured `contains` lives in string.ts. */
  includes: (n, args) => {
    need(n, args, 2);
    if (args[0].kind !== "list") return bool(false);
    return bool(args[0].value.some((v) => scalarEq(v, args[1])));
  },

  unique: (n, args) => {
    need(n, args, 1);
    if (args[0].kind !== "list") return args[0];
    const out: FormulaValue[] = [];
    for (const v of args[0].value) {
      if (!out.some((u) => scalarEq(u, v))) out.push(v);
    }
    return list(out);
  },
};
