import type { Database, Page, Property, PropertyValue } from "@/shared/types/domain";
import { parseFileRef } from "@/slices/files";
import { evalFormula, formatFormulaValue, type FormulaError } from "./formulaEngine";

/** Display-side wrapper. New typed engine evaluates internally; we still
 *  return a string for cell rendering and rollup composition. */
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

export function computeRollup(
  aggregate: Property["rollupAggregate"],
  linkedPages: Page[],
  targetProp: Property | undefined,
  pages: Page[],
  targetDb: Database,
): string {
  const total = linkedPages.length;
  if (aggregate === "count") return String(total);

  const values = linkedPages.map((page) =>
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

  // numeric aggregates
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

  // date aggregates
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
