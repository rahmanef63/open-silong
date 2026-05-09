import { describe, it, expect } from "vitest";
import { buildSelectionExport } from "./buildExport";
import type { Page, Database } from "@/shared/types/domain";

const mkPage = (id: string, parentId: string | null = null, extra: Partial<Page> = {}): Page => ({
  id, parentId, title: id, icon: "📄", blocks: [],
  favorite: false, trashed: false,
  createdAt: 0, updatedAt: 0,
  ...extra,
});

const baseInput = {
  workspace: { name: "Test", emoji: "🧪" },
  includeDatabases: true,
  includeRows: true,
  depth: 5 as const,
};

describe("buildSelectionExport — page selection + depth", () => {
  const pages: Page[] = [
    mkPage("root1"),
    mkPage("a", "root1"),
    mkPage("b", "root1"),
    mkPage("c", "a"),
    mkPage("d", "c"),
    mkPage("e", "d"),
    mkPage("root2"),
  ];

  it("depth=0 only exports the root", () => {
    const r = buildSelectionExport({ ...baseInput, depth: 0, rootIds: ["root1"], allPages: pages, allDatabases: [] });
    expect(r.counts.pages).toBe(1);
  });

  it("depth=1 exports root + immediate children", () => {
    const r = buildSelectionExport({ ...baseInput, depth: 1, rootIds: ["root1"], allPages: pages, allDatabases: [] });
    expect(r.counts.pages).toBe(3); // root1, a, b
  });

  it("depth=2 includes grandchildren", () => {
    const r = buildSelectionExport({ ...baseInput, depth: 2, rootIds: ["root1"], allPages: pages, allDatabases: [] });
    expect(r.counts.pages).toBe(4); // + c
  });

  it("depth=5 exports all reachable", () => {
    const r = buildSelectionExport({ ...baseInput, depth: 5, rootIds: ["root1"], allPages: pages, allDatabases: [] });
    expect(r.counts.pages).toBe(6); // root1, a, b, c, d, e
  });

  it("multiple roots merge", () => {
    const r = buildSelectionExport({ ...baseInput, depth: 1, rootIds: ["root1", "root2"], allPages: pages, allDatabases: [] });
    expect(r.counts.pages).toBe(4); // root1, a, b, root2
  });

  it("trashed pages are dropped from the source set", () => {
    const tpages = [...pages, mkPage("t", "root1", { trashed: true })];
    const r = buildSelectionExport({ ...baseInput, depth: 1, rootIds: ["root1"], allPages: tpages, allDatabases: [] });
    expect(r.counts.pages).toBe(3);
  });
});

describe("buildSelectionExport — database collection", () => {
  it("collects databaseId from a top-level database block", () => {
    const pages = [
      mkPage("p1", null, { blocks: [{ id: "b1", type: "database", text: "", databaseId: "db1" } as any] }),
    ];
    const dbs: Database[] = [
      { id: "db1", name: "DB1", icon: "📋", properties: [], rowIds: [], views: [], activeViewId: "v", createdAt: 0, updatedAt: 0 },
      { id: "db2", name: "DB2", icon: "📋", properties: [], rowIds: [], views: [], activeViewId: "v", createdAt: 0, updatedAt: 0 },
    ];
    const r = buildSelectionExport({ ...baseInput, depth: 0, rootIds: ["p1"], allPages: pages, allDatabases: dbs });
    expect(r.counts.databases).toBe(1);
  });

  it("walks nested children + columns to find database refs", () => {
    const pages = [
      mkPage("p1", null, { blocks: [{
        id: "b1", type: "columns2", text: "",
        columns: [
          [{ id: "x", type: "database", text: "", databaseId: "db1" }],
          [{ id: "y", type: "toggle", text: "", children: [{ id: "z", type: "database", text: "", databaseId: "db2" }] }],
        ],
      } as any] }),
    ];
    const dbs: Database[] = [
      { id: "db1", name: "DB1", icon: "📋", properties: [], rowIds: [], views: [], activeViewId: "v", createdAt: 0, updatedAt: 0 },
      { id: "db2", name: "DB2", icon: "📋", properties: [], rowIds: [], views: [], activeViewId: "v", createdAt: 0, updatedAt: 0 },
    ];
    const r = buildSelectionExport({ ...baseInput, depth: 0, rootIds: ["p1"], allPages: pages, allDatabases: dbs });
    expect(r.counts.databases).toBe(2);
  });

  it("includeDatabases=false skips db collection", () => {
    const pages = [
      mkPage("p1", null, { blocks: [{ id: "b1", type: "database", text: "", databaseId: "db1" } as any] }),
    ];
    const dbs: Database[] = [
      { id: "db1", name: "DB1", icon: "📋", properties: [], rowIds: [], views: [], activeViewId: "v", createdAt: 0, updatedAt: 0 },
    ];
    const r = buildSelectionExport({ ...baseInput, includeDatabases: false, depth: 0, rootIds: ["p1"], allPages: pages, allDatabases: dbs });
    expect(r.counts.databases).toBe(0);
  });

  it("includeRows pulls row pages of included dbs into the export", () => {
    const pages = [
      mkPage("p1", null, { blocks: [{ id: "b1", type: "database", text: "", databaseId: "db1" } as any] }),
      mkPage("row1", null, { rowOfDatabaseId: "db1" }),
      mkPage("row2", null, { rowOfDatabaseId: "db1" }),
      mkPage("orphan", null, { rowOfDatabaseId: "dbX" }), // not included
    ];
    const dbs: Database[] = [
      { id: "db1", name: "DB1", icon: "📋", properties: [], rowIds: ["row1", "row2"], views: [], activeViewId: "v", createdAt: 0, updatedAt: 0 },
    ];
    const r = buildSelectionExport({ ...baseInput, depth: 0, rootIds: ["p1"], allPages: pages, allDatabases: dbs });
    expect(r.counts.pages).toBe(3); // p1 + row1 + row2
  });

  it("includeRows=false only exports the page selection", () => {
    const pages = [
      mkPage("p1", null, { blocks: [{ id: "b1", type: "database", text: "", databaseId: "db1" } as any] }),
      mkPage("row1", null, { rowOfDatabaseId: "db1" }),
    ];
    const dbs: Database[] = [
      { id: "db1", name: "DB1", icon: "📋", properties: [], rowIds: ["row1"], views: [], activeViewId: "v", createdAt: 0, updatedAt: 0 },
    ];
    const r = buildSelectionExport({ ...baseInput, includeRows: false, depth: 0, rootIds: ["p1"], allPages: pages, allDatabases: dbs });
    expect(r.counts.pages).toBe(1);
  });
});

describe("buildSelectionExport — output shape", () => {
  it("emits ImportSchema-compatible payload", () => {
    const r = buildSelectionExport({ ...baseInput, depth: 0, rootIds: ["p1"], allPages: [mkPage("p1")], allDatabases: [] });
    const obj = JSON.parse(r.json);
    expect(obj.version).toBe(1);
    expect(obj.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(obj.workspace).toEqual({ name: "Test", emoji: "🧪" });
    expect(Array.isArray(obj.pages)).toBe(true);
    expect(Array.isArray(obj.databases)).toBe(true);
    expect(Array.isArray(obj.snapshots)).toBe(true);
  });

  it("strips derived fields from page projection", () => {
    const pages = [mkPage("p1", null, { databaseHostFor: ["db1"], blockCount: 5, previewText: "hello" } as any)];
    const r = buildSelectionExport({ ...baseInput, depth: 0, rootIds: ["p1"], allPages: pages, allDatabases: [] });
    const obj = JSON.parse(r.json);
    expect(obj.pages[0].databaseHostFor).toBeUndefined();
    expect(obj.pages[0].blockCount).toBeUndefined();
    expect(obj.pages[0].previewText).toBeUndefined();
  });
});

describe("buildSelectionExport — robustness", () => {
  it("cycle-safe — page that is its own ancestor doesn't loop forever", () => {
    const pages = [mkPage("a", "a"), mkPage("b", "a")];
    const r = buildSelectionExport({ ...baseInput, depth: 5, rootIds: ["a"], allPages: pages, allDatabases: [] });
    expect(r.counts.pages).toBeLessThanOrEqual(2);
  });

  it("unknown root id silently produces empty export", () => {
    const r = buildSelectionExport({ ...baseInput, depth: 5, rootIds: ["ghost"], allPages: [], allDatabases: [] });
    expect(r.counts.pages).toBe(0);
  });

  it("empty rootIds → empty export", () => {
    const r = buildSelectionExport({ ...baseInput, depth: 5, rootIds: [], allPages: [mkPage("p1")], allDatabases: [] });
    expect(r.counts.pages).toBe(0);
  });
});
