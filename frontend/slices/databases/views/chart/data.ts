import type { ChartAggregate, Property } from "@/shared/types/domain";

export function labelFor(prop: Property | undefined, raw: any): string {
  if (raw === undefined || raw === null || raw === "") return "—";
  if (!prop) return String(raw);
  if (prop.type === "select" || prop.type === "status") {
    const opt = prop.options?.find(o => o.id === raw);
    return opt?.name ?? "—";
  }
  if (prop.type === "multi_select") {
    const ids = Array.isArray(raw) ? raw : [];
    if (ids.length === 0) return "—";
    return ids.map(id => prop.options?.find(o => o.id === id)?.name ?? "—").join(", ");
  }
  if (prop.type === "checkbox") return raw ? "Checked" : "Unchecked";
  if (prop.type === "date") return (raw as any)?.date ?? "—";
  if (prop.type === "number") return Number.isFinite(raw) ? String(raw) : "—";
  if (Array.isArray(raw)) return raw.length ? raw.join(", ") : "—";
  return String(raw);
}

export function aggregate(values: number[], agg: ChartAggregate): number {
  if (!values.length) return 0;
  switch (agg) {
    case "count": return values.length;
    case "sum": return values.reduce((a, b) => a + b, 0);
    case "avg": return values.reduce((a, b) => a + b, 0) / values.length;
    case "min": return Math.min(...values);
    case "max": return Math.max(...values);
  }
}
