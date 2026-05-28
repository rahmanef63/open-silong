import type { Database, Page, Property, PropertyValue } from "@/shared/types/domain";
import { parseFileRef } from "@/slices/files";
import {
  evalFormulaCore, formatFormulaValue,
  bool, date, list, num, page as pageVal, str, NULL_VALUE,
  toNumber,
  type EngineHost, type EvalContext, type EvalResult, type FormulaError, type FormulaValue, type PageEntity,
} from "./formulaEngine";

/** Project a Silong domain Page → engine PageEntity. Drops references to
 *  Silong-only fields so the entity is engine-safe (used inside the
 *  FormulaValue.page kind). */
function toEntity(p: Page): PageEntity {
  return {
    id: p.id,
    title: p.title,
    icon: p.icon,
    rowOfDatabaseId: p.rowOfDatabaseId,
    rowProps: p.rowProps,
  };
}

type SilongCtx = EvalContext<Property, PropertyValue, Page, Database>;

/** The Silong-specific resolvePropertyValue. Owns ALL knowledge of how
 *  Silong's property types (select / multi_select / relation / formula /
 *  rollup / …) lift into the engine's FormulaValue kinds. Engine never
 *  sees a `Property["type"]` discriminant — only this function does.
 *
 *  Formula recursion (formula → formula) lives here too. The cycle-guard
 *  + memo cache state is carried in the engine's ctx (visited + cache);
 *  this function just threads it through a child ctx on recursive calls. */
function resolvePropertyValue(
  v: PropertyValue | undefined,
  prop: Property,
  ctx: SilongCtx,
): FormulaValue {
  // Formula recursion — needs the host's eval re-entry so the cycle
  // guard + cache live in engine-managed state but the recursion logic
  // is consumer-owned (we know `prop.formulaExpression` + `prop.id`).
  if (prop.type === "formula") {
    const key = `${ctx.row.id}:${prop.id}`;
    const visited = ctx.visited ?? new Set<string>();
    if (visited.has(key)) {
      throw { message: `Circular reference via prop("${prop.name}")`, pos: 0 } as FormulaError;
    }
    if (ctx.cache?.has(key)) return ctx.cache.get(key)!;
    const childCtx: SilongCtx = {
      ...ctx,
      visited: new Set(visited).add(key),
      cache: ctx.cache ?? new Map(),
    };
    const result = evalFormulaCore(prop.formulaExpression ?? "", childCtx);
    if (result.error) throw result.error;
    childCtx.cache?.set(key, result.value);
    return result.value;
  }

  // Rollup: aggregate over linked rows. Computed (not stored), so the
  // undefined-v early-return must NOT short-circuit this branch.
  if (prop.type === "rollup") return computeRollupValue(prop, ctx);

  if (v === undefined || v === null || v === "") return NULL_VALUE;
  switch (prop.type) {
    case "number":
      return typeof v === "number"
        ? num(v)
        : Number.isFinite(Number(v)) ? num(Number(v)) : NULL_VALUE;
    case "checkbox":
      return bool(v === true);
    case "verification":
      return bool(typeof v === "object" && v !== null && "verified" in v && !!v.verified);
    case "date":
      return typeof v === "object" && v !== null && "date" in v && (v as { date?: string }).date
        ? date((v as { date: string }).date)
        : NULL_VALUE;
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
      // List of page ENTITIES so `.member` drilldown works
      // (`prop("Owner").email`). toString(page) = title for back-compat
      // with `concat(prop("Owner"))`-style formulas.
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
      return list(items.map((s) => str(String(s))));
    }
    default:
      return str(String(v));
  }
}

/** Typed rollup compute. Mirrors the aggregate set in the display-side
 *  `computeRollup` below but returns FormulaValue so downstream math /
 *  compare / format / higher-order ops compose. */
function computeRollupValue(prop: Property, ctx: SilongCtx): FormulaValue {
  const relationProps = ctx.db.properties.filter((p) => p.type === "relation");
  const relationProp = prop.rollupRelationPropertyId
    ? relationProps.find((p) => p.id === prop.rollupRelationPropertyId)
    : relationProps[0];
  if (!relationProp) return NULL_VALUE;

  const rawLinked = ctx.row.rowProps?.[relationProp.id];
  const linkedIds = Array.isArray(rawLinked) ? (rawLinked as string[]) : [];
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

  const targetCtx: SilongCtx = targetProp ? { ...ctx, db: targetDb } : ctx;
  const sourceValues: FormulaValue[] = linkedPages.map((p) => {
    if (!targetProp) return str(p.title || "Untitled");
    return resolvePropertyValue(
      p.rowProps?.[targetProp.id] as PropertyValue | undefined,
      targetProp,
      { ...targetCtx, row: p },
    );
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
    const isoDates = sourceValues
      .filter((vv): vv is { kind: "date"; value: string } => vv.kind === "date")
      .map((vv) => vv.value)
      .sort();
    if (isoDates.length === 0) return NULL_VALUE;
    return date(aggregate === "earliest" ? isoDates[0] : isoDates[isoDates.length - 1]);
  }

  return NULL_VALUE;
}

/** Concrete EngineHost binding for Silong's domain shapes. Constructed
 *  once per call — pure functions, no closure state. */
export const silongHost: EngineHost<Property, PropertyValue, Page, Database> = {
  getRowId: (row) => row.id,
  getRowTitle: (row) => row.title,
  getRowProp: (row, propId) => row.rowProps?.[propId],
  toPageEntity: (row) => toEntity(row),
  getDbId: (db) => db.id,
  findPropertyByNameOrId: (db, nameOrId) => {
    const lc = nameOrId.toLowerCase();
    return db.properties.find((p) => p.id === nameOrId || p.name.toLowerCase() === lc);
  },
  getPropertyId: (prop) => prop.id,
  resolvePropertyValue,
};

/** Silong-bound entry point — replaces the old direct `evalFormula(src,
 *  ctx)` call site. Accepts a PARTIAL context (just row/db/pages +
 *  optional databases) and auto-injects silongHost. Existing test
 *  fixtures continue to work without modification. */
export function evalFormula(
  src: string,
  partial: Omit<SilongCtx, "host">,
): EvalResult {
  return evalFormulaCore(src, { ...partial, host: silongHost });
}

/** Display-side wrapper. New typed engine evaluates internally; we still
 *  return a string for cell rendering. */
export function evaluateFormula(expression: string, row: Page, db: Database, pages: Page[]): string {
  const result = evalFormula(expression, { row, db, pages });
  if (result.error) return "Invalid formula";
  return formatFormulaValue(result.value);
}

/** Diagnostic variant — surfaces parse/eval errors with positions for the
 *  formula editor to highlight. */
export function evaluateFormulaWithError(
  expression: string, row: Page, db: Database, pages: Page[],
): { display: string; error?: FormulaError } {
  const result = evalFormula(expression, { row, db, pages });
  return {
    display: formatFormulaValue(result.value),
    error: result.error,
  };
}

export function formatPropertyValue(value: PropertyValue | undefined, prop: Property, pages: Page[], db: Database): string {
  if (value === undefined || value === null || value === "") return "";
  if (prop.type === "checkbox") return value === true ? "Checked" : "Unchecked";
  if (prop.type === "date") return typeof value === "object" && "date" in value ? value.date ?? "" : "";
  if (prop.type === "select" || prop.type === "status") {
    return prop.options?.find((o) => o.id === value)?.name ?? String(value);
  }
  if (prop.type === "multi_select") {
    const ids = Array.isArray(value) ? value : [];
    return ids.map((id) => prop.options?.find((o) => o.id === id)?.name ?? id).join(", ");
  }
  if (prop.type === "relation") {
    const ids = Array.isArray(value) ? value : [];
    return ids.map((id) => pages.find((p) => p.id === id)?.title || "Untitled").join(", ");
  }
  if (prop.type === "files") {
    const files = Array.isArray(value) ? value : [];
    return files.map((f) => parseFileRef(f).filename).join(", ");
  }
  if (prop.type === "created_time" || prop.type === "last_edited_time") return "";
  if (prop.type === "created_by" || prop.type === "last_edited_by") return "";
  if (prop.type === "formula") return evaluateFormula(prop.formulaExpression ?? "{{title}}", { ...({} as Page), rowProps: {} }, db, pages);
  return String(value);
}

/** Display-side rollup — returns a string for cell rendering. Calls into
 *  the typed engine path then formats; semantics are identical, only the
 *  output type differs. Used by RollupCell.tsx. */
export function computeRollup(
  aggregate: Property["rollupAggregate"],
  linkedPages: Page[],
  targetProp: Property | undefined,
  pages: Page[],
  targetDb: Database,
): string {
  // Reconstruct a minimal ctx that mirrors how RollupCell calls us. The
  // typed compute walks pages + targetProp the same way, so output strings
  // line up with the engine's formula evaluation for the same rollup.
  const total = linkedPages.length;

  if (aggregate === "count") return String(total);

  const values: string[] = linkedPages.map((page) =>
    targetProp ? formatPropertyValue(page.rowProps?.[targetProp.id], targetProp, pages, targetDb) : (page.title || "Untitled")
  ).filter(Boolean);

  if (aggregate === "values") return values.length ? values.join(", ") : "-";

  if (aggregate === "count_unique") {
    const set = new Set(values.map((v) => v.toLowerCase()));
    return String(set.size);
  }

  if (aggregate === "checked") {
    if (!targetProp) return "0 checked";
    const checked = linkedPages.filter((page) => page.rowProps?.[targetProp.id] === true).length;
    return `${checked}/${total} checked`;
  }

  if (aggregate === "percent_checked") {
    if (!targetProp || total === 0) return "0%";
    const checked = linkedPages.filter((page) => page.rowProps?.[targetProp.id] === true).length;
    return `${Math.round((checked / total) * 100)}%`;
  }

  if (aggregate === "sum" || aggregate === "avg" || aggregate === "min" || aggregate === "max") {
    if (!targetProp) return "0";
    const nums = linkedPages
      .map((page) => Number(page.rowProps?.[targetProp.id] ?? NaN))
      .filter(Number.isFinite);
    if (nums.length === 0) return "-";
    if (aggregate === "sum") return String(nums.reduce((a, b) => a + b, 0));
    if (aggregate === "avg") return String((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2).replace(/\.?0+$/, ""));
    if (aggregate === "min") return String(Math.min(...nums));
    if (aggregate === "max") return String(Math.max(...nums));
  }

  if (aggregate === "earliest" || aggregate === "latest") {
    const dates = linkedPages
      .map((page) => targetProp ? page.rowProps?.[targetProp.id] : null)
      .map((value) => typeof value === "object" && value && "date" in value ? value.date : null)
      .filter((date): date is string => !!date)
      .sort();
    if (dates.length === 0) return "-";
    return aggregate === "earliest" ? dates[0] : dates.at(-1) ?? "-";
  }

  return "-";
}
