import type { FormulaValue } from "./types";
import { toNumber } from "./coerce";

/** Same-kind value equality. Cross-kind compares always false (Notion
 *  semantics — `1 == "1"` is false, not coerced). `null == null` is true,
 *  `null == anything-else` is false. Lists compare element-wise. Pages
 *  compare by id (entity identity). */
export function formulaEqual(a: FormulaValue, b: FormulaValue): boolean {
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
export function formulaCompare(a: FormulaValue, b: FormulaValue): number {
  if (a.kind === "date" && b.kind === "date") return a.value.localeCompare(b.value);
  if (a.kind === "string" && b.kind === "string") return a.value.localeCompare(b.value);
  const an = toNumber(a);
  const bn = toNumber(b);
  if (Number.isNaN(an) || Number.isNaN(bn)) return 0;
  if (an < bn) return -1;
  if (an > bn) return 1;
  return 0;
}
