import type { Database, Page, Property, PropertyValue } from "@/shared/types/domain";
import {
  bool, date, list, num, str, NULL_VALUE,
  type ExprNode, type FormulaError, type FormulaValue, type Node,
} from "./types";
import { toBoolean, toNumber, formatFormulaValue } from "./coerce";
import { parseFormula } from "./parser";
import { evalCall } from "./functions";

/** Same-kind value equality. Cross-kind compares always false (Notion
 *  semantics — `1 == "1"` is false, not coerced). `null == null` is true,
 *  `null == anything-else` is false. Lists compare element-wise. */
function formulaEqual(a: FormulaValue, b: FormulaValue): boolean {
  if (a.kind === "null" && b.kind === "null") return true;
  if (a.kind === "null" || b.kind === "null") return false;
  if (a.kind !== b.kind) return false;
  if (a.kind === "list" && b.kind === "list") {
    if (a.value.length !== b.value.length) return false;
    return a.value.every((v, i) => formulaEqual(v, b.value[i]));
  }
  // Remaining kinds (string/number/boolean/date) all carry a `value` field
  // and are scalar — narrow via the discriminant.
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

export interface EvalContext {
  row: Page;
  db: Database;
  pages: Page[];
  /** Visited keys "rowId:propId" — circular-dependency guard. */
  visited?: Set<string>;
  /** Memoization for repeated formulas across the same tree. */
  cache?: Map<string, FormulaValue>;
}

export interface EvalResult {
  value: FormulaValue;
  error?: FormulaError;
}

export function evalFormula(src: string, ctx: EvalContext): EvalResult {
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

function evalNode(node: Node, ctx: EvalContext): FormulaValue {
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

function evalExpr(node: ExprNode, ctx: EvalContext): FormulaValue {
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
      // All non-short-circuit ops need both sides evaluated.
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
      // Arithmetic — coerce both sides to number.
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
    case "call": return evalCall(node, node.args.map((a) => evalExpr(a, ctx)));
  }
}

function resolveRef(name: string, ctx: EvalContext, pos: number): FormulaValue {
  const lc = name.toLowerCase();
  if (lc === "title" || lc === "name") return str(ctx.row.title || "");
  if (lc === "now") return date(new Date().toISOString());
  if (lc === "today") return date(new Date().toISOString().slice(0, 10));

  const prop = ctx.db.properties.find(
    (p) => p.id === name || p.name.toLowerCase() === lc,
  );
  if (!prop) return NULL_VALUE;

  if (prop.type === "formula") {
    const key = `${ctx.row.id}:${prop.id}`;
    const visited = ctx.visited ?? new Set<string>();
    if (visited.has(key)) {
      throw { message: `Circular reference via {{${name}}}`, pos } as FormulaError;
    }
    if (ctx.cache?.has(key)) return ctx.cache.get(key)!;

    const childCtx: EvalContext = {
      ...ctx,
      visited: new Set(visited).add(key),
      cache: ctx.cache ?? new Map(),
    };
    const result = evalFormula(prop.formulaExpression ?? "", childCtx);
    if (result.error) throw result.error;
    childCtx.cache?.set(key, result.value);
    return result.value;
  }

  return propertyValueToFormulaValue(ctx.row.rowProps?.[prop.id], prop, ctx);
}

function propertyValueToFormulaValue(
  v: PropertyValue | undefined,
  prop: Property,
  ctx: EvalContext,
): FormulaValue {
  if (v === undefined || v === null || v === "") return NULL_VALUE;
  switch (prop.type) {
    case "number":
      return typeof v === "number" ? num(v) : Number.isFinite(Number(v)) ? num(Number(v)) : NULL_VALUE;
    case "checkbox":
      return bool(v === true);
    case "verification":
      return bool(typeof v === "object" && v !== null && "verified" in v && !!v.verified);
    case "date":
      return typeof v === "object" && "date" in v && v.date ? date(v.date) : NULL_VALUE;
    case "select":
    case "status": {
      const opt = prop.options?.find((o) => o.id === v);
      return str(opt?.name ?? String(v));
    }
    case "multi_select": {
      const ids = Array.isArray(v) ? v : [];
      return list(ids.map((id) => str(prop.options?.find((o) => o.id === id)?.name ?? id)));
    }
    case "relation": {
      const ids = Array.isArray(v) ? v : [];
      return list(
        ids.map((id) => {
          const p = ctx.pages.find((pg) => pg.id === id && !pg.trashed);
          return str(p?.title || "Untitled");
        }),
      );
    }
    case "files": {
      const items = Array.isArray(v) ? v : [];
      return list(items.map((s) => str(s)));
    }
    default:
      return str(String(v));
  }
}
