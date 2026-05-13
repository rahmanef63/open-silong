import type { PropertyType } from "@/shared/types/domain";

export function inferFilterOp(t: PropertyType): "contains" | "equals" | "not_empty" | "is_empty" | "checked" | "unchecked" {
  if (t === "checkbox") return "checked";
  if (t === "select" || t === "status" || t === "multi_select") return "equals";
  return "contains";
}
