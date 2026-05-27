import { num } from "../types";
import { toNumber } from "../coerce";
import { need, type FnRegistry, type FnSignatureMap } from "./_registry";

export const numberSigs: FnSignatureMap = {
  round:  { args: ["n"],          returns: "number", group: "number", desc: "Nearest integer" },
  floor:  { args: ["n"],          returns: "number", group: "number", desc: "Round down" },
  ceil:   { args: ["n"],          returns: "number", group: "number", desc: "Round up" },
  abs:    { args: ["n"],          returns: "number", group: "number", desc: "Absolute value" },
  sign:   { args: ["n"],          returns: "number", group: "number", desc: "-1, 0, or 1" },
  sqrt:   { args: ["n"],          returns: "number", group: "number", desc: "Square root" },
  exp:    { args: ["n"],          returns: "number", group: "number", desc: "e raised to n" },
  ln:     { args: ["n"],          returns: "number", group: "number", desc: "Natural log" },
  log10:  { args: ["n"],          returns: "number", group: "number", desc: "Base-10 log" },
  log2:   { args: ["n"],          returns: "number", group: "number", desc: "Base-2 log" },
  sin:    { args: ["radians"],    returns: "number", group: "number", desc: "Sine" },
  cos:    { args: ["radians"],    returns: "number", group: "number", desc: "Cosine" },
  tan:    { args: ["radians"],    returns: "number", group: "number", desc: "Tangent" },
  pow:    { args: ["base", "exp"], returns: "number", group: "number", desc: "base raised to exp" },
  mod:    { args: ["a", "b"],     returns: "number", group: "number", desc: "Remainder of a / b" },
  min:    { args: ["...values"],  returns: "number", group: "number", desc: "Smallest (vararg or list)" },
  max:    { args: ["...values"],  returns: "number", group: "number", desc: "Largest (vararg or list)" },
  pi:     { args: [],             returns: "number", group: "number", desc: "Math.PI" },
  e:      { args: [],             returns: "number", group: "number", desc: "Math.E" },
};

/** Wrap a 1-arg Math.* for the registry. */
const m1 = (fn: (x: number) => number) =>
  (n: { fn: string; pos: number }, args: ReturnType<typeof toNumber> extends number ? Parameters<typeof toNumber>[0][] : never) => {
    need(n, args as never, 1);
    return num(fn(toNumber((args as never)[0])));
  };

export const numberFns: FnRegistry = {
  round: (n, args) => {
    need(n, args, 1);
    return num(Math.round(toNumber(args[0])));
  },
  floor: (n, args) => {
    need(n, args, 1);
    return num(Math.floor(toNumber(args[0])));
  },
  ceil: (n, args) => {
    need(n, args, 1);
    return num(Math.ceil(toNumber(args[0])));
  },
  abs: (n, args) => {
    need(n, args, 1);
    return num(Math.abs(toNumber(args[0])));
  },
  sign: (n, args) => {
    need(n, args, 1);
    return num(Math.sign(toNumber(args[0])));
  },
  sqrt: (n, args) => {
    need(n, args, 1);
    return num(Math.sqrt(toNumber(args[0])));
  },
  exp: (n, args) => {
    need(n, args, 1);
    return num(Math.exp(toNumber(args[0])));
  },
  ln: (n, args) => {
    need(n, args, 1);
    return num(Math.log(toNumber(args[0])));
  },
  log10: (n, args) => {
    need(n, args, 1);
    return num(Math.log10(toNumber(args[0])));
  },
  log2: (n, args) => {
    need(n, args, 1);
    return num(Math.log2(toNumber(args[0])));
  },
  sin: (n, args) => {
    need(n, args, 1);
    return num(Math.sin(toNumber(args[0])));
  },
  cos: (n, args) => {
    need(n, args, 1);
    return num(Math.cos(toNumber(args[0])));
  },
  tan: (n, args) => {
    need(n, args, 1);
    return num(Math.tan(toNumber(args[0])));
  },
  pow: (n, args) => {
    need(n, args, 2);
    return num(Math.pow(toNumber(args[0]), toNumber(args[1])));
  },
  mod: (n, args) => {
    need(n, args, 2);
    const b = toNumber(args[1]);
    return b === 0 ? num(NaN) : num(toNumber(args[0]) % b);
  },

  /** min / max — accept either a list arg OR varargs of numbers.
   *  `min(prop("Scores"))` and `min(1, 2, 3)` both work. */
  min: (_n, args) => {
    const nums = args.length === 1 && args[0].kind === "list"
      ? args[0].value.map(toNumber)
      : args.map(toNumber);
    const finite = nums.filter(Number.isFinite);
    return num(finite.length ? Math.min(...finite) : NaN);
  },
  max: (_n, args) => {
    const nums = args.length === 1 && args[0].kind === "list"
      ? args[0].value.map(toNumber)
      : args.map(toNumber);
    const finite = nums.filter(Number.isFinite);
    return num(finite.length ? Math.max(...finite) : NaN);
  },

  /** Constants — parser requires `()` after every ident, so these are
   *  zero-arg fns rather than bare identifiers. Notion uses the same shape. */
  pi: () => num(Math.PI),
  e: () => num(Math.E),
};

// Mark m1 as used to silence eslint — keep available as a future helper
// when we add more 1-arg math fns. (Not exported because public API stays
// the registry only.)
void m1;
