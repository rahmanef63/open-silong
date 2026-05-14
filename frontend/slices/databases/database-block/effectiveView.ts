import type { Block, DatabaseViewConfig } from "@/shared/types/domain";

/** Merge a database view with this-block's overrides. Only the
 *  non-structural fields can be overridden — filters, sorts, groupBy,
 *  search, hiddenPropIds, frozenPropIds, tableCalcs. Anything else
 *  comes from the DB so view-type, name, calendar/chart wiring etc
 *  stay shared across linked instances. */
export function mergeViewOverrides(
  view: DatabaseViewConfig,
  block: Block | undefined,
): DatabaseViewConfig {
  const o = block?.viewOverrides?.[view.id];
  if (!o) return view;
  return {
    ...view,
    filters: (o.filters as DatabaseViewConfig["filters"]) ?? view.filters,
    sorts: (o.sorts as DatabaseViewConfig["sorts"]) ?? view.sorts,
    groupBy: o.groupBy ?? view.groupBy,
    search: o.search ?? view.search,
    hiddenPropIds: o.hiddenPropIds ?? view.hiddenPropIds,
    frozenPropIds: o.frozenPropIds ?? view.frozenPropIds,
    tableCalcs: o.tableCalcs ?? view.tableCalcs,
  };
}

/** Keys that participate in per-block override. Other view-config
 *  fields fall through to `updateView(db, ...)` directly. */
const OVERRIDE_KEYS = new Set([
  "filters", "sorts", "groupBy", "search",
  "hiddenPropIds", "frozenPropIds", "tableCalcs",
]);

/** Split a view-patch into the (overridable, db-direct) buckets. */
export function splitViewPatch(patch: Partial<DatabaseViewConfig>): {
  override: Partial<DatabaseViewConfig>;
  direct: Partial<DatabaseViewConfig>;
} {
  const override: Partial<DatabaseViewConfig> = {};
  const direct: Partial<DatabaseViewConfig> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (OVERRIDE_KEYS.has(k)) (override as Record<string, unknown>)[k] = v;
    else (direct as Record<string, unknown>)[k] = v;
  }
  return { override, direct };
}
