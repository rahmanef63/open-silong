/**
 * Convex-shape EngineHost — second consumer of the genericized formula
 * engine. PRE-PUBLISH location: lives here so vitest can run the parity
 * test against silongHost while the engine source still lives at
 * `lib/formulaEngine/`. POST-PUBLISH (1.G.2 step A) this file moves to
 * `convex/features/formulas/host.ts` and swaps its engine import to
 * `rahman-shared/formulaEngine` — at that point Convex deploy can bundle
 * it cleanly since the engine code is no longer in the frontend tree.
 *
 * Why this exists: it's the validation that EngineHost's 8-method
 * surface is sufficient for a second domain shape (Convex's Doc<"pages">
 * + Doc<"databases">). Any gap would surface during implementation here
 * and signal an API tweak BEFORE we lock in npm publish.
 */

// This IS the Convex-shape host adapter; Doc<"pages"> / Doc<"databases">
// are the whole point. The NotionAdapter rule targets UI code; this file
// moves to convex/features/formulas/host.ts post-publish (1.G.2 step A)
// where the import is native. Type-only, so erased at compile.
// eslint-disable-next-line no-restricted-imports
import type { Doc } from "@convex/_generated/dataModel";
import {
  bool, date, list, num, page as pageVal, str, NULL_VALUE,
  evalFormulaCore, formatFormulaValue, toNumber,
  type EngineHost, type EvalContext, type EvalResult, type FormulaError,
  type FormulaValue, type PageEntity,
} from "./formulaEngine";

/** Convex stores `rowProps` + `properties` + `cover` as v.any() / arrays
 *  of v.any() at the schema level. Frontend's `Property` is the typed
 *  view, but the engine never sees those types — they're opaque TProp /
 *  TVal generic slots. We mirror that opacity here with `any` so the
 *  Convex host doesn't need to import the frontend's Property type. */
type CProperty = {
  id: string;
  name: string;
  type: string;
  options?: Array<{ id: string; name: string; color?: string }>;
  formulaExpression?: string;
  rollupRelationPropertyId?: string | null;
  rollupTargetPropertyId?: string | null;
  rollupAggregate?: string;
  relationDatabaseId?: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [k: string]: any;
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CPropertyValue = any;
type CPage = Doc<"pages">;
type CDb = Doc<"databases">;

type CCtx = EvalContext<CProperty, CPropertyValue, CPage, CDb>;

function toEntity(row: CPage): PageEntity {
  return {
    id: String(row._id),
    title: row.title,
    icon: row.icon,
    rowOfDatabaseId: row.rowOfDatabaseId ? String(row.rowOfDatabaseId) : undefined,
    rowProps: row.rowProps as Record<string, unknown> | undefined,
  };
}

function resolvePropertyValue(
  v: CPropertyValue | undefined,
  prop: CProperty,
  ctx: CCtx,
): FormulaValue {
  // Formula recursion — identical to silongHost. Cycle guard + cache live
  // in engine-managed ctx; we just thread them through.
  if (prop.type === "formula") {
    const key = `${String(ctx.row._id)}:${prop.id}`;
    const visited = ctx.visited ?? new Set<string>();
    if (visited.has(key)) {
      throw { message: `Circular reference via prop("${prop.name}")`, pos: 0 } as FormulaError;
    }
    if (ctx.cache?.has(key)) return ctx.cache.get(key)!;
    const childCtx: CCtx = {
      ...ctx,
      visited: new Set(visited).add(key),
      cache: ctx.cache ?? new Map(),
    };
    const result = evalFormulaCore(prop.formulaExpression ?? "", childCtx);
    if (result.error) throw result.error;
    childCtx.cache?.set(key, result.value);
    return result.value;
  }

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
      return typeof v === "object" && v !== null && "date" in v && v.date
        ? date(String(v.date))
        : NULL_VALUE;
    case "select":
    case "status": {
      const opt = prop.options?.find((o) => o.id === v);
      return str(opt?.name ?? String(v));
    }
    case "multi_select": {
      const ids = Array.isArray(v) ? v : [];
      return list(ids.map((id) => str(prop.options?.find((o) => o.id === id)?.name ?? String(id))));
    }
    case "relation": {
      const ids = Array.isArray(v) ? v : [];
      const entries: FormulaValue[] = [];
      for (const id of ids) {
        const p = ctx.pages.find((pg) => String(pg._id) === String(id) && !pg.trashed);
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

function computeRollupValue(prop: CProperty, ctx: CCtx): FormulaValue {
  const relationProps = (ctx.db.properties as CProperty[]).filter((p) => p.type === "relation");
  const relationProp = prop.rollupRelationPropertyId
    ? relationProps.find((p) => p.id === prop.rollupRelationPropertyId)
    : relationProps[0];
  if (!relationProp) return NULL_VALUE;

  const rawLinked = (ctx.row.rowProps as Record<string, unknown> | undefined)?.[relationProp.id];
  const linkedIds = Array.isArray(rawLinked) ? (rawLinked as string[]) : [];
  const linkedPages = linkedIds
    .map((id) => ctx.pages.find((p) => String(p._id) === String(id)))
    .filter((p): p is CPage => !!p && !p.trashed);

  const targetDb = (ctx.databases ?? [ctx.db]).find(
    (d) => String(d._id) === String(relationProp.relationDatabaseId),
  ) ?? ctx.db;
  const targetProp = prop.rollupTargetPropertyId
    ? (targetDb.properties as CProperty[]).find((p) => p.id === prop.rollupTargetPropertyId)
    : undefined;

  const aggregate = prop.rollupAggregate ?? "count";
  const total = linkedPages.length;

  if (aggregate === "count") return num(total);

  const targetCtx: CCtx = targetProp ? { ...ctx, db: targetDb } : ctx;
  const sourceValues: FormulaValue[] = linkedPages.map((p) => {
    if (!targetProp) return str(p.title || "Untitled");
    return resolvePropertyValue(
      (p.rowProps as Record<string, unknown> | undefined)?.[targetProp.id],
      targetProp,
      { ...targetCtx, row: p },
    );
  });

  if (aggregate === "values") return list(sourceValues);

  if (aggregate === "count_unique") {
    const seen = new Set<string>();
    for (const vv of sourceValues) {
      const key = formatFormulaValue(vv).toLowerCase();
      if (key !== "") seen.add(key);
    }
    return num(seen.size);
  }

  if (aggregate === "checked") {
    if (!targetProp) return num(0);
    return num(linkedPages.filter((p) => (p.rowProps as Record<string, unknown> | undefined)?.[targetProp.id] === true).length);
  }

  if (aggregate === "percent_checked") {
    if (!targetProp || total === 0) return num(0);
    const checked = linkedPages.filter((p) => (p.rowProps as Record<string, unknown> | undefined)?.[targetProp.id] === true).length;
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

export const convexHost: EngineHost<CProperty, CPropertyValue, CPage, CDb> = {
  getRowId: (row) => String(row._id),
  getRowTitle: (row) => row.title,
  getRowProp: (row, propId) => (row.rowProps as Record<string, unknown> | undefined)?.[propId],
  toPageEntity: toEntity,
  getDbId: (db) => String(db._id),
  findPropertyByNameOrId: (db, nameOrId) => {
    const lc = nameOrId.toLowerCase();
    return (db.properties as CProperty[]).find(
      (p) => p.id === nameOrId || p.name.toLowerCase() === lc,
    );
  },
  getPropertyId: (prop) => prop.id,
  resolvePropertyValue,
};

/** Convenience wrapper mirroring silongHost's `evalFormula` — auto-injects
 *  the Convex host. Use from Convex query handlers (post-1.G.3 wiring). */
export function evalFormulaConvex(
  src: string,
  partial: Omit<CCtx, "host">,
): EvalResult {
  return evalFormulaCore(src, { ...partial, host: convexHost });
}
