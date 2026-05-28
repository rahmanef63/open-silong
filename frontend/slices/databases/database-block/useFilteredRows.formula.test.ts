import { describe, expect, it } from "vitest";
import type { Database, DatabaseViewConfig, Page } from "@/shared/types/domain";
import { filterSortRows } from "./useFilteredRows";

/** 1.G.3 — formula/rollup columns are filterable + sortable.
 *  filterSortRows routes computed props through the engine; these tests
 *  verify a formula column behaves correctly in filter + sort, and that
 *  stored props keep their existing raw-path behavior. */

const mkPage = (o: Partial<Page>): Page => ({
  id: "p", parentId: null, title: "", icon: "", blocks: [],
  favorite: false, trashed: false, createdAt: 0, updatedAt: 0, rowProps: {},
  ...o,
});

// DB with a number prop `score` + a formula `doubled` = score * 2.
const db: Database = {
  id: "db", name: "T", icon: "📁",
  properties: [
    { id: "score", name: "Score", type: "number" },
    { id: "doubled", name: "Doubled", type: "formula", formulaExpression: "=prop(\"score\") * 2" },
    { id: "passing", name: "Passing", type: "formula", formulaExpression: "=prop(\"score\") >= 50" },
  ],
  rowIds: ["a", "b", "c"],
  views: [],
  activeViewId: "",
  createdAt: 0, updatedAt: 0,
};
const rowA = mkPage({ id: "a", title: "A", rowOfDatabaseId: "db", rowProps: { score: 30 } });
const rowB = mkPage({ id: "b", title: "B", rowOfDatabaseId: "db", rowProps: { score: 70 } });
const rowC = mkPage({ id: "c", title: "C", rowOfDatabaseId: "db", rowProps: { score: 50 } });
const rows = [rowA, rowB, rowC];
const pages = rows;
const databases = [db];

const view = (over: Partial<DatabaseViewConfig>): DatabaseViewConfig => ({
  id: "v", type: "table", name: "V",
  ...over,
} as DatabaseViewConfig);

describe("filterSortRows — formula columns (1.G.3)", () => {
  it("sorts ASC by a formula column (numeric)", () => {
    const v = view({ sorts: [{ propertyId: "doubled", direction: "asc" }] });
    const out = filterSortRows(rows, v, db, pages, databases);
    expect(out.map((p) => p.id)).toEqual(["a", "c", "b"]); // 60, 100, 140
  });

  it("sorts DESC by a formula column", () => {
    const v = view({ sorts: [{ propertyId: "doubled", direction: "desc" }] });
    const out = filterSortRows(rows, v, db, pages, databases);
    expect(out.map((p) => p.id)).toEqual(["b", "c", "a"]);
  });

  it("filters by a boolean formula column — checked", () => {
    const v = view({ filters: [{ propertyId: "passing", op: "checked" }] });
    const out = filterSortRows(rows, v, db, pages, databases);
    // score >= 50 → B (70), C (50)
    expect(out.map((p) => p.id).sort()).toEqual(["b", "c"]);
  });

  it("filters by a boolean formula column — unchecked", () => {
    const v = view({ filters: [{ propertyId: "passing", op: "unchecked" }] });
    const out = filterSortRows(rows, v, db, pages, databases);
    expect(out.map((p) => p.id)).toEqual(["a"]); // only 30 < 50
  });

  it("filters by formula column — equals on formatted value", () => {
    const v = view({ filters: [{ propertyId: "doubled", op: "equals", value: "140" }] });
    const out = filterSortRows(rows, v, db, pages, databases);
    expect(out.map((p) => p.id)).toEqual(["b"]);
  });

  it("filters by formula column — contains", () => {
    const v = view({ filters: [{ propertyId: "doubled", op: "contains", value: "0" }] });
    const out = filterSortRows(rows, v, db, pages, databases);
    // "60" "140" "100" all contain "0" → all three
    expect(out.map((p) => p.id).sort()).toEqual(["a", "b", "c"]);
  });

  it("numeric sort beats string sort — 100 > 60 not '100' < '60'", () => {
    // Without engine routing, string compare would order "100" before "60".
    // Confirm numeric ordering: 60 < 100 < 140 → a, c, b
    const v = view({ sorts: [{ propertyId: "doubled", direction: "asc" }] });
    const out = filterSortRows(rows, v, db, pages, databases);
    expect(out.map((p) => p.id)).toEqual(["a", "c", "b"]);
  });

  it("degrades gracefully without engine ctx — formula col uses raw (empty) path", () => {
    // No db/pages/databases → computed props fall to raw rowProps (undefined).
    // All rows compare equal on the missing key → stable input order.
    const v = view({ sorts: [{ propertyId: "doubled", direction: "asc" }] });
    const out = filterSortRows(rows, v);
    expect(out.map((p) => p.id)).toEqual(["a", "b", "c"]);
  });

  it("stored props keep raw-path behavior (number prop as string compare)", () => {
    // `score` is a stored number prop — uses the raw localeCompare path.
    const v = view({ sorts: [{ propertyId: "score", direction: "asc" }] });
    const out = filterSortRows(rows, v, db, pages, databases);
    // String compare of "30","70","50" → "30" < "50" < "70" → a, c, b
    expect(out.map((p) => p.id)).toEqual(["a", "c", "b"]);
  });

  it("search still works alongside formula filters", () => {
    const v = view({
      search: "B",
      sorts: [{ propertyId: "doubled", direction: "asc" }],
    });
    const out = filterSortRows(rows, v, db, pages, databases);
    expect(out.map((p) => p.id)).toEqual(["b"]);
  });
});
