import type { ExprNode, FormulaError, FormulaValue } from "../types";
import { bool, list, num, NULL_VALUE } from "../types";
import { toBoolean, toNumber } from "../coerce";
// Type-only import — erased at compile time, so the runtime circular
// (evaluator.ts imports higherOrderFns; we'd be importing back into it)
// is moot. We just need the shape for handler typing.
import type { EvalContext } from "../evaluator";
import type { FnSignatureMap } from "./_registry";

/** Higher-order fn handlers differ from regular FnHandlers because they
 *  must NOT pre-evaluate their lambda-position arg — `map(list, current *
 *  2)` would coerce `current` to NULL on the first eval, losing all
 *  iteration semantics. The evaluator special-cases these names BEFORE
 *  the generic call path so handlers receive raw AST nodes + the
 *  eval-time context + a recursive evalExpr ref.
 *
 *  Body forms accepted (matches the lambda parser in ParserClass.ts):
 *    - explicit:  `(current) => expr`   `(current, index) => expr`
 *    - implicit:  bare expr referencing `current` / `index` / `accumulator`
 *
 *  In both cases, the body is re-evaluated per iteration with a fresh
 *  envStack frame bound to `current` + `index` (+ `accumulator` for
 *  reduce). Explicit param NAMES are ALSO bound by position — useful
 *  if the user picks a different reserved name like `index` first. */

type EvalExprFn = (n: ExprNode, ctx: EvalContext) => FormulaValue;

export type HigherOrderHandler = (
  node: { fn: string; args: ExprNode[]; pos: number },
  ctx: EvalContext,
  evalExpr: EvalExprFn,
) => FormulaValue;

function need(
  node: { fn: string; pos: number },
  args: ExprNode[],
  n: number,
): void {
  if (args.length < n) {
    throw { message: `'${node.fn}' needs ${n} argument(s)`, pos: node.pos } as FormulaError;
  }
}

function asList(v: FormulaValue): FormulaValue[] {
  return v.kind === "list" ? v.value : [v];
}

/** Build a per-iteration env frame, evaluate the body. Lambda-AST bodies
 *  unwrap; bare-expr bodies eval as-is — both see the same frame via
 *  envStack lookup in resolveRef. */
function applyLambda(
  arg: ExprNode,
  current: FormulaValue,
  index: number,
  ctx: EvalContext,
  evalExpr: EvalExprFn,
  extra?: Record<string, FormulaValue>,
): FormulaValue {
  const frame: Record<string, FormulaValue> = {
    current,
    index: num(index),
    ...(extra ?? {}),
  };
  let body: ExprNode = arg;
  if (arg.kind === "lambda") {
    body = arg.body;
    // Bind explicit params by position. Reserved names (current/index/
    // accumulator) usually match the defaults already in `frame`; an
    // off-name like `(index) => ...` would override `index` with the
    // current element — odd but consistent with positional binding.
    if (arg.params[0]) frame[arg.params[0].toLowerCase()] = current;
    if (arg.params[1]) frame[arg.params[1].toLowerCase()] = num(index);
  }
  return evalExpr(body, {
    ...ctx,
    envStack: [...(ctx.envStack ?? []), frame],
  });
}

export const higherOrderFns: Record<string, HigherOrderHandler> = {
  map: (node, ctx, evalE) => {
    need(node, node.args, 2);
    const items = asList(evalE(node.args[0], ctx));
    return list(items.map((el, i) => applyLambda(node.args[1], el, i, ctx, evalE)));
  },

  filter: (node, ctx, evalE) => {
    need(node, node.args, 2);
    const items = asList(evalE(node.args[0], ctx));
    return list(items.filter((el, i) => toBoolean(applyLambda(node.args[1], el, i, ctx, evalE))));
  },

  /** `reduce(list, body, initial)` — body sees `current` + `index` +
   *  `accumulator`. Initial value is eagerly evaluated (it can't depend
   *  on iteration state) and seeds the accumulator. */
  reduce: (node, ctx, evalE) => {
    need(node, node.args, 3);
    const items = asList(evalE(node.args[0], ctx));
    let acc: FormulaValue = evalE(node.args[2], ctx);
    for (let i = 0; i < items.length; i++) {
      acc = applyLambda(node.args[1], items[i], i, ctx, evalE, { accumulator: acc });
    }
    return acc;
  },

  find: (node, ctx, evalE) => {
    need(node, node.args, 2);
    const items = asList(evalE(node.args[0], ctx));
    for (let i = 0; i < items.length; i++) {
      if (toBoolean(applyLambda(node.args[1], items[i], i, ctx, evalE))) {
        return items[i];
      }
    }
    return NULL_VALUE;
  },

  /** `sort(list, body)` — body returns the sort KEY per element; list is
   *  re-ordered ascending by that key. Stable sort (Array.prototype.sort
   *  is stable in V8/JSC/SpiderMonkey since ES2019). Compare rule mirrors
   *  evaluator.formulaCompare: date/date + string/string compare
   *  lexicographically (ISO 8601 dates sort chronologically); other kinds
   *  coerce to number. NaN → treated as 0-difference. */
  sort: (node, ctx, evalE) => {
    need(node, node.args, 2);
    const items = asList(evalE(node.args[0], ctx));
    const scored = items.map((el, i) => ({
      el,
      key: applyLambda(node.args[1], el, i, ctx, evalE),
    }));
    scored.sort((a, b) => compareSortKey(a.key, b.key));
    return list(scored.map((s) => s.el));
  },

  /** `every(list, body)` — true iff body coerces truthy for ALL elements.
   *  Short-circuits on first false. Vacuous: empty list → true. */
  every: (node, ctx, evalE) => {
    need(node, node.args, 2);
    const items = asList(evalE(node.args[0], ctx));
    for (let i = 0; i < items.length; i++) {
      if (!toBoolean(applyLambda(node.args[1], items[i], i, ctx, evalE))) {
        return bool(false);
      }
    }
    return bool(true);
  },

  /** `some(list, body)` — true iff body coerces truthy for at least one
   *  element. Short-circuits on first true. Vacuous: empty list → false. */
  some: (node, ctx, evalE) => {
    need(node, node.args, 2);
    const items = asList(evalE(node.args[0], ctx));
    for (let i = 0; i < items.length; i++) {
      if (toBoolean(applyLambda(node.args[1], items[i], i, ctx, evalE))) {
        return bool(true);
      }
    }
    return bool(false);
  },
};

/** Inline mini-compare matching evaluator.formulaCompare — avoids a back
 *  import. Keep the rules in sync if formulaCompare changes. */
function compareSortKey(a: FormulaValue, b: FormulaValue): number {
  if (a.kind === "date" && b.kind === "date") return a.value.localeCompare(b.value);
  if (a.kind === "string" && b.kind === "string") return a.value.localeCompare(b.value);
  const an = toNumber(a);
  const bn = toNumber(b);
  if (Number.isNaN(an) || Number.isNaN(bn)) return 0;
  return an - bn;
}

export const higherOrderSigs: FnSignatureMap = {
  map:    { args: ["list", "body"],            returns: "list",    group: "list", desc: "Transform each element via lambda body" },
  filter: { args: ["list", "body"],            returns: "list",    group: "list", desc: "Keep elements where body is truthy" },
  reduce: { args: ["list", "body", "initial"], returns: "any",     group: "list", desc: "Fold via `accumulator` ref" },
  find:   { args: ["list", "body"],            returns: "any",     group: "list", desc: "First element where body is truthy" },
  sort:   { args: ["list", "body"],            returns: "list",    group: "list", desc: "Sort ascending by sort-key computed from body" },
  every:  { args: ["list", "body"],            returns: "boolean", group: "list", desc: "True iff body is truthy for all elements" },
  some:   { args: ["list", "body"],            returns: "boolean", group: "list", desc: "True iff body is truthy for at least one element" },
};
