import { useMemo } from "react";
import type { Database, DatabaseViewConfig, Page, Property } from "@/shared/types/domain";
import { evalFormula } from "../lib/formula";
import {
  formatFormulaValue, isEmpty, toBoolean, toNumber, toString,
  type FormulaValue,
} from "../lib/formulaEngine";

/** Property types whose cell value is COMPUTED (not stored in rowProps).
 *  Filtering / sorting on these must evaluate through the formula engine
 *  rather than reading the (absent) raw stored value. */
const COMPUTED_TYPES = new Set(["formula", "rollup"]);

/** Typed value for `prop` on `row`, evaluated via the engine. `prop("<id>")`
 *  resolves by id; the engine handles formula recursion + rollup
 *  aggregation + relation drilldown. */
function computeCell(
  row: Page,
  prop: Property,
  db: Database,
  pages: Page[],
  databases: Database[],
): FormulaValue {
  return evalFormula(`=prop(${JSON.stringify(prop.id)})`, {
    row, db, pages, databases,
  }).value;
}

/** Typed comparison for sort keys — date+date lex, numeric when either is
 *  number, else string lex. Mirrors the engine's formulaCompare rules
 *  (kept local to avoid widening the engine's public surface). */
function compareCell(a: FormulaValue, b: FormulaValue): number {
  if (a.kind === "date" && b.kind === "date") return a.value.localeCompare(b.value);
  if (a.kind === "number" || b.kind === "number") {
    const an = toNumber(a);
    const bn = toNumber(b);
    if (Number.isNaN(an) || Number.isNaN(bn)) return 0;
    return an - bn;
  }
  return toString(a).localeCompare(toString(b));
}

/** Filter + sort + search a row set against a view config.
 *
 *  Stored properties (text/number/select/etc) use the raw rowProps path —
 *  unchanged from before. Computed properties (formula/rollup) route
 *  through the engine, but ONLY when the optional `db` + `pages` +
 *  `databases` triplet is supplied (so callers that don't have the schema
 *  handy degrade gracefully to the raw path).
 *
 *  Sort keys for computed props are memoized once per sort pass
 *  (`keyCache`) so an N-row sort does O(N) evals, not O(N log N). This is
 *  the lazy per-view cache — recomputed whenever rows/view/db change. */
export function useFilteredRows(
  rows: Page[],
  view: DatabaseViewConfig | undefined,
  db?: Database,
  pages?: Page[],
  databases?: Database[],
) {
  return useMemo(
    () => filterSortRows(rows, view, db, pages, databases),
    [rows, view, db, pages, databases],
  );
}

/** Pure filter + sort + search — the body of useFilteredRows, extracted
 *  for unit testing without a React renderer. */
export function filterSortRows(
  rows: Page[],
  view: DatabaseViewConfig | undefined,
  db?: Database,
  pages?: Page[],
  databases?: Database[],
): Page[] {
  {
    if (!view) return [];
    let out = rows;

    const propById = new Map((db?.properties ?? []).map((p) => [p.id, p]));
    const canCompute = !!db && !!pages && !!databases;
    const isComputed = (propId: string) => {
      const p = propById.get(propId);
      return canCompute && !!p && COMPUTED_TYPES.has(p.type);
    };

    if (view.search?.trim()) {
      const q = view.search.toLowerCase();
      out = out.filter((p) =>
        (p.title || "").toLowerCase().includes(q) ||
        Object.values(p.rowProps ?? {}).some((v) => String(v ?? "").toLowerCase().includes(q)),
      );
    }

    for (const f of view.filters ?? []) {
      const computed = isComputed(f.propertyId);
      const prop = propById.get(f.propertyId);
      out = out.filter((p) => {
        if (computed && prop && db && pages && databases) {
          const val = computeCell(p, prop, db, pages, databases);
          switch (f.op) {
            case "contains":  return formatFormulaValue(val).toLowerCase().includes((f.value ?? "").toLowerCase());
            case "equals":    return formatFormulaValue(val) === (f.value ?? "");
            case "not_empty": return !isEmpty(val);
            case "is_empty":  return isEmpty(val);
            case "checked":   return toBoolean(val);
            case "unchecked": return !toBoolean(val);
          }
          return true;
        }
        const v = p.rowProps?.[f.propertyId];
        switch (f.op) {
          case "contains":
            return String(v ?? "").toLowerCase().includes((f.value ?? "").toLowerCase());
          case "equals":
            return String(v ?? "") === (f.value ?? "");
          case "not_empty":
            return v !== undefined && v !== null && v !== "";
          case "is_empty":
            return v === undefined || v === null || v === "";
          case "checked":
            return v === true;
          case "unchecked":
            return v !== true;
        }
      });
    }

    if ((view.sorts ?? []).length) {
      // Per-pass sort-key memo for computed props — one eval per (prop, row).
      const keyCache = new Map<string, FormulaValue>();
      const computedKey = (row: Page, propId: string, prop: Property): FormulaValue => {
        const ck = `${propId}:${row.id}`;
        let v = keyCache.get(ck);
        if (!v) {
          v = computeCell(row, prop, db!, pages!, databases!);
          keyCache.set(ck, v);
        }
        return v;
      };
      out = [...out].sort((a, b) => {
        for (const s of view.sorts!) {
          const computed = isComputed(s.propertyId);
          const prop = propById.get(s.propertyId);
          let cmp: number;
          if (computed && prop) {
            cmp = compareCell(computedKey(a, s.propertyId, prop), computedKey(b, s.propertyId, prop));
          } else {
            const av = a.rowProps?.[s.propertyId];
            const bv = b.rowProps?.[s.propertyId];
            cmp = String(av ?? "").localeCompare(String(bv ?? ""));
          }
          if (cmp !== 0) return s.direction === "asc" ? cmp : -cmp;
        }
        return 0;
      });
    }
    return out;
  }
}

export function useDatabaseRows(database: Database | undefined, allPages: Page[]) {
  return useMemo(() => {
    if (!database) return [] as Page[];
    const map = new Map(allPages.map((p) => [p.id, p]));
    return database.rowIds.map((id) => map.get(id)).filter((p): p is Page => !!p && !p.trashed);
  }, [database, allPages]);
}

export function useIsLinked(database: Database | undefined, allPages: Page[], isInline: boolean) {
  return useMemo(() => {
    if (!isInline || !database) return false;
    let hosts = 0;
    for (const p of allPages) {
      if (p.trashed) continue;
      const blocks = p.blocks ?? [];
      for (const b of blocks) {
        if (b.type === "database" && b.databaseId === database.id) {
          hosts++;
          if (hosts > 1) return true;
        }
      }
    }
    return false;
  }, [database, allPages, isInline]);
}
