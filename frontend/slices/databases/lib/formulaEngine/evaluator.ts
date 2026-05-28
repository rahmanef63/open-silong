import {
  bool, date, list, num, str, NULL_VALUE,
  type ExprNode, type FormulaError, type FormulaValue, type Node,
} from "./types";
import { toBoolean, toNumber, formatFormulaValue } from "./coerce";
import { parseFormula } from "./parser";
import { evalCall } from "./functions";
import { higherOrderFns } from "./functions/higherOrder";
import type { EvalContext, EngineHost } from "./host";

export type { EvalContext, EngineHost } from "./host";

/** Same-kind value equality. Cross-kind compares always false (Notion
 *  semantics — `1 == "1"` is false, not coerced). `null == null` is true,
 *  `null == anything-else` is false. Lists compare element-wise. Pages
 *  compare by id (entity identity). */
function formulaEqual(a: FormulaValue, b: FormulaValue): boolean {
  if (a.kind === "null" && b.kind === "null") return true;
  if (a.kind === "null" || b.kind === "null") return false;
  if (a.kind !== b.kind) return false;
  if (a.kind === "list" && b.kind === "list") {
    if (a.value.length !== b.value.length) return false;
    return a.value.every((v, i) => formulaEqual(v, b.value[i]));
  }
  if (a.kind === "page" && b.kind === "page") return a.value.id === b.value.id;
  return (a as { value: unknown }).value === (b as { value: unknown }).value;
}

/** Ordering for `<` `<=` `>` `>=`. Date/date and string/string compare
 *  lexicographically (ISO 8601 dates sort chronologically by lex). Mixed
 *  or numeric types coerce to number — NaN-safe (NaN compares neither way,
 *  so we treat as 0-difference to avoid runtime errors). */
function formulaCompare(a: FormulaValue, b: FormulaValue): number {
  if (a.kind === "date" && b.kind === "date") return a.value.localeCompare(b.value);
  if (a.kind === "string" && b.kind === "string") return a.value.localeCompare(b.value);
  const an = toNumber(a);
  const bn = toNumber(b);
  if (Number.isNaN(an) || Number.isNaN(bn)) return 0;
  if (an < bn) return -1;
  if (an > bn) return 1;
  return 0;
}

export interface EvalResult {
  value: FormulaValue;
  error?: FormulaError;
}

/** Engine entry point. Generic over the host's domain shape — the host
 *  is the SOLE boundary between this pure engine and any consumer's
 *  domain types (Silong's Page/Database/Property, a Convex Doc-shape
 *  adapter, etc). Errors flow back as `{ error }`; never thrown to the
 *  caller (parse + eval phases both wrap throws). */
export function evalFormulaCore<TProp, TVal, TPage, TDb>(
  src: string,
  ctx: EvalContext<TProp, TVal, TPage, TDb>,
): EvalResult {
  const parsed = parseFormula(src);
  if (parsed.ast === null) return { value: str("Invalid formula"), error: parsed.error };
  try {
    const value = evalNode(parsed.ast, ctx);
    return { value };
  } catch (e) {
    const err = e as FormulaError;
    return { value: str("Invalid formula"), error: err };
  }
}

function evalNode<TProp, TVal, TPage, TDb>(
  node: Node,
  ctx: EvalContext<TProp, TVal, TPage, TDb>,
): FormulaValue {
  if (node.kind === "tmpl") {
    if (node.parts.length === 1 && node.parts[0].kind === "text") {
      return str(node.parts[0].value);
    }
    let out = "";
    for (const p of node.parts) {
      if (p.kind === "text") out += p.value;
      else out += formatFormulaValue(resolveRef(p.name, ctx, p.pos));
    }
    return str(out);
  }
  if (node.kind === "math") return evalExpr(node.expr, ctx);
  if (node.kind === "expr") return evalExpr(node.expr, ctx);
  return NULL_VALUE;
}

function evalExpr<TProp, TVal, TPage, TDb>(
  node: ExprNode,
  ctx: EvalContext<TProp, TVal, TPage, TDb>,
): FormulaValue {
  switch (node.kind) {
    case "num": return num(node.value);
    case "str": return str(node.value);
    case "bool": return bool(node.value);
    case "ref": return resolveRef(node.name, ctx, node.pos);
    case "unary": {
      if (node.op === "!") return bool(!toBoolean(evalExpr(node.arg, ctx)));
      const v = toNumber(evalExpr(node.arg, ctx));
      return num(node.op === "-" ? -v : v);
    }
    case "binop": {
      // Short-circuit logical ops first — eval right side only when needed.
      // Both sides coerce to boolean (Notion returns bool, not the truthy
      // operand value like JS does). Short-circuit also means a broken
      // right-side ref doesn't throw when left already decides the result.
      if (node.op === "&&") {
        const lv = evalExpr(node.left, ctx);
        if (!toBoolean(lv)) return bool(false);
        return bool(toBoolean(evalExpr(node.right, ctx)));
      }
      if (node.op === "||") {
        const lv = evalExpr(node.left, ctx);
        if (toBoolean(lv)) return bool(true);
        return bool(toBoolean(evalExpr(node.right, ctx)));
      }
      const lv = evalExpr(node.left, ctx);
      const rv = evalExpr(node.right, ctx);
      if (node.op === "==") return bool(formulaEqual(lv, rv));
      if (node.op === "!=") return bool(!formulaEqual(lv, rv));
      if (node.op === ">" || node.op === "<" || node.op === ">=" || node.op === "<=") {
        const cmp = formulaCompare(lv, rv);
        switch (node.op) {
          case ">":  return bool(cmp > 0);
          case "<":  return bool(cmp < 0);
          case ">=": return bool(cmp >= 0);
          case "<=": return bool(cmp <= 0);
        }
      }
      const l = toNumber(lv);
      const r = toNumber(rv);
      switch (node.op) {
        case "+": return num(l + r);
        case "-": return num(l - r);
        case "*": return num(l * r);
        case "/": return r === 0 ? num(NaN) : num(l / r);
        case "%": return r === 0 ? num(NaN) : num(l % r);
      }
      return num(NaN);
    }
    case "call": {
      // Higher-order fns (map/filter/reduce/find/...) must NOT pre-evaluate
      // their lambda-position args — that would resolve `current` to NULL
      // before the env frame is bound. Dispatch directly with raw AST args.
      const ho = higherOrderFns[node.fn] ?? higherOrderFns[node.fn.toLowerCase()];
      if (ho) return ho(node, ctx as unknown as never, evalExpr as never);
      return evalCall(node, node.args.map((a) => evalExpr(a, ctx)));
    }
    case "member": return resolveMember(evalExpr(node.object, ctx), node.member, ctx);
    // Bare lambda in non-lambda position evaluates to NULL — lambdas only
    // do useful work when consumed by a higher-order fn which re-evaluates
    // the body with the env frame bound to each element.
    case "lambda": return NULL_VALUE;
  }
}

/** Drill into a page entity (or list of pages) via `.member` access.
 *  Built-in fields (title / icon / id) take priority; otherwise we walk
 *  the page's database property schema via the host. Cross-db drilldown
 *  needs ctx.databases populated. Returns NULL for any other object kind
 *  (scalar primitives have no members in Notion's model). */
function resolveMember<TProp, TVal, TPage, TDb>(
  obj: FormulaValue,
  member: string,
  ctx: EvalContext<TProp, TVal, TPage, TDb>,
): FormulaValue {
  if (obj.kind === "null") return NULL_VALUE;
  if (obj.kind === "list") {
    return list(obj.value.map((v) => resolveMember(v, member, ctx)));
  }
  if (obj.kind === "page") {
    const lc = member.toLowerCase();
    if (lc === "title" || lc === "name") return str(obj.value.title || "");
    if (lc === "icon") return str(obj.value.icon || "");
    if (lc === "id") return str(obj.value.id);
    // Find target db by id (page entity carries rowOfDatabaseId) via host.
    const pool = ctx.databases ?? [ctx.db];
    const targetDb = pool.find(
      (d) => ctx.host.getDbId(d) === obj.value.rowOfDatabaseId,
    );
    if (!targetDb) return NULL_VALUE;
    const prop = ctx.host.findPropertyByNameOrId(targetDb, member);
    if (!prop) return NULL_VALUE;
    const target = ctx.pages.find((p) => ctx.host.getRowId(p) === obj.value.id);
    if (!target) return NULL_VALUE;
    const propId = ctx.host.getPropertyId(prop);
    const v = ctx.host.getRowProp(target, propId);
    // Re-thread ctx with the target db so any host-side type-dispatch (e.g.
    // formula/rollup) inside resolvePropertyValue sees the right schema.
    const targetCtx: EvalContext<TProp, TVal, TPage, TDb> = { ...ctx, db: targetDb, row: target };
    return ctx.host.resolvePropertyValue(v, prop, targetCtx);
  }
  return NULL_VALUE;
}

function resolveRef<TProp, TVal, TPage, TDb>(
  name: string,
  ctx: EvalContext<TProp, TVal, TPage, TDb>,
  _pos: number,
): FormulaValue {
  const lc = name.toLowerCase();
  // Lambda env stack — innermost frame wins. Shadows built-ins + property
  // refs when populated, so `current` inside `map(...)` always points at
  // the iteration element even when a property named "Current" exists.
  if (ctx.envStack && ctx.envStack.length > 0) {
    for (let i = ctx.envStack.length - 1; i >= 0; i--) {
      const v = ctx.envStack[i][lc];
      if (v !== undefined) return v;
    }
  }
  if (lc === "title" || lc === "name") return str(ctx.host.getRowTitle(ctx.row) || "");
  if (lc === "now") return date(new Date().toISOString());
  if (lc === "today") return date(new Date().toISOString().slice(0, 10));

  const prop = ctx.host.findPropertyByNameOrId(ctx.db, name);
  if (!prop) return NULL_VALUE;
  const propId = ctx.host.getPropertyId(prop);
  const v = ctx.host.getRowProp(ctx.row, propId);
  return ctx.host.resolvePropertyValue(v, prop, ctx);
}
