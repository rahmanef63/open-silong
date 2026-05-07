import { describe, expect, it } from "vitest";
import { computeCalc, validCalcs } from "./calcAggregate";
import type { Page, Property } from "@/shared/types/domain";

const prop = (patch: Partial<Property> = {}): Property => ({
  id: "p", name: "n", type: "number", ...patch,
});
const row = (val: unknown): Page => ({
  id: Math.random().toString(36),
  parentId: null, title: "", icon: "", blocks: [],
  favorite: false, trashed: false,
  rowOfDatabaseId: "db",
  rowProps: { p: val as Page["rowProps"][string] },
  createdAt: 0, updatedAt: 0,
} as Page);

describe("validCalcs", () => {
  it("number → numeric aggregates", () => {
    const v = validCalcs(prop({ type: "number" }));
    expect(v).toContain("sum");
    expect(v).toContain("average");
    expect(v).not.toContain("checked");
  });

  it("checkbox → boolean aggregates", () => {
    const v = validCalcs(prop({ type: "checkbox" }));
    expect(v).toContain("checked");
    expect(v).toContain("percent_checked");
    expect(v).not.toContain("sum");
  });

  it("date → date aggregates", () => {
    const v = validCalcs(prop({ type: "date" }));
    expect(v).toContain("earliest_date");
    expect(v).toContain("date_range");
  });

  it("button → empty (no calculation makes sense)", () => {
    expect(validCalcs(prop({ type: "button" }))).toEqual([]);
  });
});

describe("computeCalc", () => {
  it("count_all returns total row count", () => {
    const rows = [row(1), row(null), row(2)];
    expect(computeCalc(rows, prop(), "count_all")).toBe("3");
  });

  it("count_values ignores empty", () => {
    const rows = [row(1), row(null), row(2)];
    expect(computeCalc(rows, prop(), "count_values")).toBe("2");
  });

  it("sum sums numeric values", () => {
    const rows = [row(10), row(20), row(null), row(5)];
    expect(computeCalc(rows, prop(), "sum")).toBe("35");
  });

  it("average / median / min / max / range over numbers", () => {
    const rows = [row(2), row(4), row(6), row(8)];
    expect(computeCalc(rows, prop(), "average")).toBe("5.00");
    expect(computeCalc(rows, prop(), "median")).toBe("5");
    expect(computeCalc(rows, prop(), "min")).toBe("2");
    expect(computeCalc(rows, prop(), "max")).toBe("8");
    expect(computeCalc(rows, prop(), "range")).toBe("6");
  });

  it("percent_not_empty returns 0-100 percent", () => {
    const rows = [row(1), row(null), row(2), row(3)];
    expect(computeCalc(rows, prop(), "percent_not_empty")).toBe("75%");
  });

  it("checked / percent_checked over checkbox", () => {
    const rows = [row(true), row(false), row(true), row(true)];
    const p = prop({ type: "checkbox" });
    expect(computeCalc(rows, p, "checked")).toBe("3");
    expect(computeCalc(rows, p, "percent_checked")).toBe("75%");
  });

  it("date_range returns days between earliest and latest", () => {
    const rows = [row("2026-01-01"), row("2026-01-11"), row(null)];
    const p = prop({ type: "date" });
    expect(computeCalc(rows, p, "date_range")).toBe("10 days");
  });

  it("returns empty string when calc=none", () => {
    expect(computeCalc([row(1)], prop(), "none")).toBe("");
  });
});
