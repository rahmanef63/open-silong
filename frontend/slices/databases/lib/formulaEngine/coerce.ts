import type { FormulaValue } from "./types";

export function toString(v: FormulaValue): string {
  switch (v.kind) {
    case "string": return v.value;
    case "number": return Number.isFinite(v.value) ? String(v.value) : "";
    case "boolean": return v.value ? "true" : "false";
    case "date": return v.value;
    case "null": return "";
    case "list": return v.value.map(toString).join(", ");
    // Page → title — keeps `concat(prop("Owner"))` printing names without
    // forcing every caller to remember to `.title` first.
    case "page": return v.value.title || "Untitled";
  }
}

export function toNumber(v: FormulaValue): number {
  switch (v.kind) {
    case "number": return v.value;
    case "string": return Number(v.value);
    case "boolean": return v.value ? 1 : 0;
    case "date": return new Date(v.value).getTime();
    case "null": return 0;
    case "list": return v.value.length;
    case "page": return NaN;
  }
}

export function toBoolean(v: FormulaValue): boolean {
  switch (v.kind) {
    case "boolean": return v.value;
    case "number": return v.value !== 0 && !Number.isNaN(v.value);
    case "string": {
      const t = v.value.trim().toLowerCase();
      return t !== "" && t !== "false" && t !== "0" && t !== "no" && t !== "unchecked";
    }
    case "date": return v.value !== "";
    case "null": return false;
    case "list": return v.value.length > 0;
    // A page entity exists by virtue of being constructed — truthy.
    case "page": return true;
  }
}

export function toDate(v: FormulaValue): Date | null {
  if (v.kind === "date" || v.kind === "string") {
    const d = new Date(v.value);
    return Number.isFinite(d.getTime()) ? d : null;
  }
  return null;
}

export function isEmpty(v: FormulaValue): boolean {
  if (v.kind === "null") return true;
  if (v.kind === "string") return v.value === "";
  if (v.kind === "list") return v.value.length === 0;
  return false;
}

export function formatFormulaValue(v: FormulaValue): string {
  return toString(v);
}
