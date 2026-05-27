import type { Database, Page, Property, PropertyValue } from "@/shared/types/domain";
import {
  bool, date, list, num, page as pageVal, str, NULL_VALUE,
  type ExprNode, type FormulaError, type FormulaValue, type Node, type PageEntity,
} from "./types";
import { toBoolean, toNumber, formatFormulaValue } from "./coerce";
import { parseFormula } from "./parser";
import { evalCall } from "./functions";
import { higherOrderFns } from "./functions/higherOrder";

/** Project a domain Page → engine-local PageEntity. Drops references to
 *  cross-slice types so the engine stays self-contained (sets up the
 *  rahman-shared extract in 1.G). */
function toEntity(p: Page): PageEntity {
  return {
    id: p.id,
    title: p.title,
    icon: p.icon,
    rowOfDatabaseId: p.rowOfDatabaseId,
    rowProps: p.rowProps,
  };
}

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
  /** Optional — every workspace database. Enables cross-db drilldown via
   *  `prop("Owner").<custom>` when the relation target belongs to another
   *  database. When omitted, drilldown is limited to `ctx.db.properties`. */
  databases?: Database[];
  /** Lambda environment stack. Each frame maps lowercase ident → value.
   *  Pushed by higher-order fns (map/filter/reduce/etc) per iteration;
   *  innermost frame wins on lookup. Bare refs to `current` / `index` /
   *  `accumulator` resolve through this BEFORE falling back to property
   *  lookup. Outside a lambda call the stack is empty/undefined. */
  envStack?: Array<Record<string, FormulaValue>>;
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
    case "call": {
      // Higher-order fns (map/filter/reduce/find/...) must NOT pre-evaluate
      // their lambda-position args — that would resolve `current` to NULL
      // before the env frame is bound. Dispatch directly with raw AST args.
      const ho = higherOrderFns[node.fn] ?? higherOrderFns[node.fn.toLowerCase()];
      if (ho) return ho(node, ctx, evalExpr);
      return evalCall(node, node.args.map((a) => evalExpr(a, ctx)));
    }
    case "member": return resolveMember(evalExpr(node.object, ctx), node.member, ctx);
    // Bare lambda in non-lambda position evaluates to NULL — lambdas only
    // do useful work when consumed by a higher-order fn (1.D.2) which
    // re-evaluates the body with the env frame bound to each element.
    case "lambda": return NULL_VALUE;
  }
}

/** Compute a rollup property's value typed for formula consumption.
 *  Mirrors the aggregate set in `lib/formula.ts::computeRollup` (which
 *  produces a display string) but returns FormulaValue so downstream
 *  math/compare/format ops work. ctx.databases enables cross-db target
 *  lookup; falls back to ctx.db when not provided.
 *
 *  Aggregates:
 *    count           → num(linkedPages.length)
 *    count_unique    → num(unique target values)
 *    sum / avg /
 *    min / max       → num — numeric coerce of target values; NULL when empty
 *    checked         → num(linkedPages where target === true)
 *    percent_checked → num(0..100) — matches the visual cell
 *    values          → list of target values (FormulaValue per item)
 *    earliest /
 *    latest          → date — sort target dates lexicographically
 *  Returns NULL_VALUE when relation/target prop is missing or list is empty
 *  in a way that has no sensible aggregate. */
function computeRollupValue(prop: Property, ctx: EvalContext): FormulaValue {
  const relationProps = ctx.db.properties.filter((p) => p.type === "relation");
  const relationProp = prop.rollupRelationPropertyId
    ? relationProps.find((p) => p.id === prop.rollupRelationPropertyId)
    : relationProps[0];
  if (!relationProp) return NULL_VALUE;

  const linkedIds = Array.isArray(ctx.row.rowProps?.[relationProp.id])
    ? (ctx.row.rowProps?.[relationProp.id] as string[])
    : [];
  const linkedPages = linkedIds
    .map((id) => ctx.pages.find((p) => p.id === id))
    .filter((p): p is Page => !!p && !p.trashed);

  const targetDb = (ctx.databases ?? [ctx.db]).find(
    (d) => d.id === relationProp.relationDatabaseId,
  ) ?? ctx.db;
  const targetProp = prop.rollupTargetPropertyId
    ? targetDb.properties.find((p) => p.id === prop.rollupTargetPropertyId)
    : undefined;

  const aggregate = prop.rollupAggregate ?? "count";
  const total = linkedPages.length;

  if (aggregate === "count") return num(total);

  // Source values (typed) — target prop value per linked page, or the
  // page title when no target prop is configured.
  const targetCtx: EvalContext = targetProp
    ? { ...ctx, db: targetDb }
    : ctx;
  const sourceValues: FormulaValue[] = linkedPages.map((p) => {
    if (!targetProp) return str(p.title || "Untitled");
    return propertyValueToFormulaValue(p.rowProps?.[targetProp.id] as PropertyValue | undefined, targetProp, targetCtx);
  });

  if (aggregate === "values") return list(sourceValues);

  if (aggregate === "count_unique") {
    const seen = new Set<string>();
    for (const v of sourceValues) {
      const key = formatFormulaValue(v).toLowerCase();
      if (key !== "") seen.add(key);
    }
    return num(seen.size);
  }

  if (aggregate === "checked") {
    if (!targetProp) return num(0);
    return num(linkedPages.filter((p) => p.rowProps?.[targetProp.id] === true).length);
  }

  if (aggregate === "percent_checked") {
    if (!targetProp || total === 0) return num(0);
    const checked = linkedPages.filter((p) => p.rowProps?.[targetProp.id] === true).length;
    return num((checked / total) * 100);
  }

  if (aggregate === "sum" || aggregate === "avg" || aggregate === "min" || aggregate === "max") {
    const nums = sourceValues.map(toNumber).filter(Number.isFinite);
    if (nums.length === 0) return NULL_VALUE;
    if (aggregate === "sum") return num(nums.reduce((a, b) => a + b, 0));
    if (aggregate === "avg") return num(nums.reduce((a, b) => a + b, 0) / nums.length);
    if (aggregate === "min") return num(Math.min(...nums));
    return num(Math.max(...nums));
  }

  if (aggregate === "earliest" || aggregate === "latest") {
    // Target prop value shape for "date" is `{ date: string }`; we already
    // unwrapped via propertyValueToFormulaValue, so sourceValues entries
    // are `date` kind when the target was a date prop.
    const isoDates = sourceValues
      .filter((v): v is { kind: "date"; value: string } => v.kind === "date")
      .map((v) => v.value)
      .sort();
    if (isoDates.length === 0) return NULL_VALUE;
    return date(aggregate === "earliest" ? isoDates[0] : isoDates[isoDates.length - 1]);
  }

  return NULL_VALUE;
}

/** Drill into a page entity (or list of pages) via `.member` access.
 *  Built-in fields (title / icon / id) take priority; otherwise we walk
 *  the page's database property schema. Cross-db drilldown needs
 *  ctx.databases populated; otherwise we only see ctx.db. Returns
 *  NULL_VALUE for any other object kind (scalar primitives have no
 *  members in Notion's model). */
function resolveMember(obj: FormulaValue, member: string, ctx: EvalContext): FormulaValue {
  if (obj.kind === "null") return NULL_VALUE;
  // List → map member access across each element. Mirrors Notion's
  // automatic-list behaviour on relation prop drilldown.
  if (obj.kind === "list") {
    return list(obj.value.map((v) => resolveMember(v, member, ctx)));
  }
  if (obj.kind === "page") {
    const lc = member.toLowerCase();
    if (lc === "title" || lc === "name") return str(obj.value.title || "");
    if (lc === "icon") return str(obj.value.icon || "");
    if (lc === "id") return str(obj.value.id);
    // Look up user-defined property by id-or-name in the page's database.
    const targetDb = (ctx.databases ?? [ctx.db]).find(
      (d) => d.id === obj.value.rowOfDatabaseId,
    );
    if (!targetDb) return NULL_VALUE;
    const prop = targetDb.properties.find(
      (p) => p.id === member || p.name.toLowerCase() === lc,
    );
    if (!prop) return NULL_VALUE;
    // Synthesize a transient row context so any recursive lookups (e.g.
    // member access on a formula prop in the target page) evaluate against
    // the right row. We DON'T enter the formula re-eval branch here —
    // member access just unwraps stored values.
    const target = ctx.pages.find((p) => p.id === obj.value.id);
    if (!target) return NULL_VALUE;
    return propertyValueToFormulaValue(target.rowProps?.[prop.id], prop, ctx);
  }
  // Scalar kinds (string / number / boolean / date) have no members.
  return NULL_VALUE;
}

function resolveRef(name: string, ctx: EvalContext, pos: number): FormulaValue {
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
  // Rollup is computed (not stored) — handle BEFORE the early-return so
  // an undefined `v` doesn't short-circuit. Bridge to the formula engine
  // returns a typed FormulaValue so `prop("Total") * 1.1` and friends
  // work without re-parsing rollup output strings.
  if (prop.type === "rollup") return computeRollupValue(prop, ctx);
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
      // Resolve to list of page ENTITIES so `.member` drilldown works
      // (`prop("Owner").email`). Back-compat preserved: `toString(page)`
      // returns title, so `concat(prop("Owner"))` and friends keep printing
      // titles unchanged.
      const ids = Array.isArray(v) ? v : [];
      const entries: FormulaValue[] = [];
      for (const id of ids) {
        const p = ctx.pages.find((pg) => pg.id === id && !pg.trashed);
        if (p) entries.push(pageVal(toEntity(p)));
        else entries.push(pageVal({ id: String(id), title: "Untitled", icon: "" }));
      }
      return list(entries);
    }
    case "files": {
      const items = Array.isArray(v) ? v : [];
      return list(items.map((s) => str(s)));
    }
    default:
      return str(String(v));
  }
}
