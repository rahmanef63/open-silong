import { bool, num, str, NULL_VALUE, type FormulaValue } from "../types";
import { isEmpty, toBoolean, toNumber, toString } from "../coerce";
import { need, type FnRegistry } from "./_registry";

export const logicFns: FnRegistry = {
  if: (n, args) => {
    need(n, args, 2);
    return toBoolean(args[0]) ? args[1] : (args[2] ?? NULL_VALUE);
  },

  /** Notion's `ifs(cond1, val1, cond2, val2, …, defaultVal)`.
   *  Walks pairs; first truthy cond returns its value. Trailing odd-count
   *  arg is the default (returns NULL when absent). */
  ifs: (n, args) => {
    need(n, args, 2);
    let i = 0;
    while (i + 1 < args.length) {
      if (toBoolean(args[i])) return args[i + 1];
      i += 2;
    }
    return args[i] ?? NULL_VALUE;
  },

  /** Notion's `switch(value, case1, val1, case2, val2, …, defaultVal)`.
   *  Equality is same-kind+same-value (matches operator `==`). */
  switch: (n, args) => {
    need(n, args, 3);
    const target = args[0];
    let i = 1;
    while (i + 1 < args.length) {
      const candidate = args[i];
      if (candidate.kind === target.kind &&
          (candidate as { value: unknown }).value === (target as { value: unknown }).value) {
        return args[i + 1];
      }
      i += 2;
    }
    return args[i] ?? NULL_VALUE;
  },

  and: (_n, args) => bool(args.every(toBoolean)),

  or: (_n, args) => bool(args.some(toBoolean)),

  not: (n, args) => {
    need(n, args, 1);
    return bool(!toBoolean(args[0]));
  },

  empty: (n, args) => {
    need(n, args, 1);
    return bool(isEmpty(args[0]));
  },

  /** Explicit coercion helpers — useful when chaining mixed-type formulas
   *  through arithmetic or template ops. */
  toboolean: (n, args) => {
    need(n, args, 1);
    return bool(toBoolean(args[0]));
  },
  tonumber: (n, args) => {
    need(n, args, 1);
    const v = toNumber(args[0]);
    return num(Number.isFinite(v) ? v : NaN);
  },
  tostring: (n, args) => {
    need(n, args, 1);
    return str(toString(args[0]));
  },
};

// Suppress unused — FormulaValue is re-exported for downstream typing
void (null as unknown as FormulaValue);
