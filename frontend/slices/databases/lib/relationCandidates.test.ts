import { describe, expect, it } from "vitest";
import { filterRelationCandidates } from "./relationCandidates";
import type { Page } from "@/shared/types/domain";

const page = (id: string, patch: Partial<Page> = {}): Page => ({
  id, parentId: null, title: id, icon: "📄", blocks: [],
  favorite: false, trashed: false, createdAt: 0, updatedAt: 0,
  ...patch,
} as Page);

describe("filterRelationCandidates — strict target", () => {
  it("returns rows of the target db only", () => {
    const pages = [
      page("a", { rowOfDatabaseId: "db1" }),
      page("b", { rowOfDatabaseId: "db1" }),
      page("c", { rowOfDatabaseId: "db2" }),
      page("d"), // free page
    ];
    const out = filterRelationCandidates({
      pages, selfRowId: "self", targetDbId: "db1",
      targetDbMissing: false, query: "",
    });
    expect(out.map((p) => p.id).sort()).toEqual(["a", "b"]);
  });

  it("excludes the hosting row", () => {
    const pages = [
      page("a", { rowOfDatabaseId: "db1" }),
      page("b", { rowOfDatabaseId: "db1" }),
    ];
    const out = filterRelationCandidates({
      pages, selfRowId: "a", targetDbId: "db1",
      targetDbMissing: false, query: "",
    });
    expect(out.map((p) => p.id)).toEqual(["b"]);
  });

  it("excludes trashed rows", () => {
    const pages = [
      page("a", { rowOfDatabaseId: "db1" }),
      page("b", { rowOfDatabaseId: "db1", trashed: true }),
    ];
    const out = filterRelationCandidates({
      pages, selfRowId: "self", targetDbId: "db1",
      targetDbMissing: false, query: "",
    });
    expect(out.map((p) => p.id)).toEqual(["a"]);
  });

  it("returns empty array when target db has no rows", () => {
    const pages = [page("a", { rowOfDatabaseId: "other" })];
    const out = filterRelationCandidates({
      pages, selfRowId: "self", targetDbId: "empty-db",
      targetDbMissing: false, query: "",
    });
    expect(out).toEqual([]);
  });

  it("applies query filter on title (case-insensitive)", () => {
    const pages = [
      page("a", { rowOfDatabaseId: "db1", title: "Alpha" }),
      page("b", { rowOfDatabaseId: "db1", title: "Beta" }),
    ];
    const out = filterRelationCandidates({
      pages, selfRowId: "self", targetDbId: "db1",
      targetDbMissing: false, query: "BET",
    });
    expect(out.map((p) => p.id)).toEqual(["b"]);
  });

  it("respects the cap", () => {
    const pages = Array.from({ length: 100 }, (_, i) =>
      page(`r${i}`, { rowOfDatabaseId: "db1" }),
    );
    const out = filterRelationCandidates({
      pages, selfRowId: "self", targetDbId: "db1",
      targetDbMissing: false, query: "", cap: 5,
    });
    expect(out.length).toBe(5);
  });
});

describe("filterRelationCandidates — legacy / no-target", () => {
  it("returns any database rows when target is null", () => {
    const pages = [
      page("a", { rowOfDatabaseId: "db1" }),
      page("b", { rowOfDatabaseId: "db2" }),
    ];
    const out = filterRelationCandidates({
      pages, selfRowId: "self", targetDbId: null,
      targetDbMissing: false, query: "",
    });
    expect(out.map((p) => p.id).sort()).toEqual(["a", "b"]);
  });

  it("falls back to non-row pages when no db rows exist", () => {
    const pages = [page("a"), page("b")];
    const out = filterRelationCandidates({
      pages, selfRowId: "self", targetDbId: undefined,
      targetDbMissing: false, query: "",
    });
    expect(out.map((p) => p.id).sort()).toEqual(["a", "b"]);
  });

  it("treats targetDbMissing the same as no target", () => {
    const pages = [
      page("a", { rowOfDatabaseId: "db1" }),
      page("b", { rowOfDatabaseId: "db2" }),
    ];
    const out = filterRelationCandidates({
      pages, selfRowId: "self", targetDbId: "ghost-db",
      targetDbMissing: true, query: "",
    });
    expect(out.map((p) => p.id).sort()).toEqual(["a", "b"]);
  });
});
