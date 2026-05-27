import { str, num } from "../types";
import { toNumber, toString, formatFormulaValue } from "../coerce";
import { need, type FnRegistry, type FnSignatureMap } from "./_registry";

export const stringSigs: FnSignatureMap = {
  concat:     { args: ["...values"],                 returns: "string", group: "string", desc: "Join values into a single string" },
  lower:      { args: ["text"],                      returns: "string", group: "string", desc: "Lowercase the string" },
  upper:      { args: ["text"],                      returns: "string", group: "string", desc: "Uppercase the string" },
  contains:   { args: ["haystack", "needle"],        returns: "boolean", group: "string", desc: "True if haystack contains needle (string)" },
  replace:    { args: ["text", "find", "with"],      returns: "string", group: "string", desc: "Replace every match of `find` with `with`" },
  replaceAll: { args: ["text", "find", "with"],      returns: "string", group: "string", desc: "Alias of replace (replaces all matches)" },
  substring:  { args: ["text", "start", "length?"],  returns: "string", group: "string", desc: "Slice by start + optional length" },
  slice:      { args: ["value", "start", "end?"],    returns: "any",    group: "string", desc: "Slice string or list (negative end allowed)" },
  repeat:     { args: ["text", "n"],                 returns: "string", group: "string", desc: "Repeat text n times (output capped 10k chars)" },
  format:     { args: ["value"],                     returns: "string", group: "string", desc: "Stringify any value" },
  indexOf:    { args: ["haystack", "needle"],        returns: "number", group: "string", desc: "Position of needle, or -1" },
};

export const stringFns: FnRegistry = {
  concat: (_n, args) => str(args.map(toString).join("")),

  lower: (n, args) => {
    need(n, args, 1);
    return str(toString(args[0]).toLowerCase());
  },

  upper: (n, args) => {
    need(n, args, 1);
    return str(toString(args[0]).toUpperCase());
  },

  contains: (n, args) => {
    need(n, args, 2);
    // List `contains` is more naturally `includes` (list.ts); keep this
    // string-only — Notion's `contains` on a list is also string-coerced.
    return { kind: "boolean", value: toString(args[0]).includes(toString(args[1])) };
  },

  replace: (n, args) => {
    need(n, args, 3);
    return str(toString(args[0]).split(toString(args[1])).join(toString(args[2])));
  },

  /** Notion-canonical alias — current `replace` already replaces ALL
   *  occurrences (split-join), so this is a synonym. Kept for compat
   *  with Notion templates copy-pasted in. */
  replaceall: (n, args) => {
    need(n, args, 3);
    return str(toString(args[0]).split(toString(args[1])).join(toString(args[2])));
  },

  substring: (n, args) => {
    need(n, args, 2);
    const s = toString(args[0]);
    const start = Math.max(0, Math.floor(toNumber(args[1])));
    if (args.length >= 3) {
      const len = Math.max(0, Math.floor(toNumber(args[2])));
      return str(s.slice(start, start + len));
    }
    return str(s.slice(start));
  },

  repeat: (n, args) => {
    need(n, args, 2);
    const s = toString(args[0]);
    // Cap at 10k chars output to block runaway memory.
    const count = Math.max(0, Math.min(10_000, Math.floor(toNumber(args[1]))));
    const capped = Math.min(count, Math.floor(10_000 / Math.max(1, s.length)));
    return str(s.repeat(capped));
  },

  /** format(value) — stringify any FormulaValue via existing formatter.
   *  Notion's format() accepts an optional pattern; we ignore the 2nd arg
   *  for now (date-format goes through formatdate() which already exists). */
  format: (n, args) => {
    need(n, args, 1);
    return str(formatFormulaValue(args[0]));
  },

  /** indexOf(haystack, needle) — string flavour; list flavour lives in list.ts.
   *  Returns -1 if not found (matches Notion). */
  indexof: (n, args) => {
    need(n, args, 2);
    if (args[0].kind === "list") {
      // Defer to list.ts dispatcher — registry order ensures list.ts overrides
      // this for list args, but if some import order changes we still want a
      // sensible fallback.
      const needle = args[1];
      const i = args[0].value.findIndex((v) => v.kind === needle.kind && (v as { value: unknown }).value === (needle as { value: unknown }).value);
      return num(i);
    }
    return num(toString(args[0]).indexOf(toString(args[1])));
  },
};
