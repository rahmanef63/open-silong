import { describe, it, expect } from "vitest";
import { groupPagesForLibrary, pageBreadcrumb, pageSource } from "../lib/groupPages";
import type { Database, Page } from "@/shared/types/domain";

function mk(id: string, patch: Partial<Page> = {}): Page {
  return {
    id,
    parentId: null,
    title: id,
    icon: "📄",
    cover: null,
    blocks: [],
    favorite: false,
    trashed: false,
    createdAt: 0,
    updatedAt: 0,
    ...patch,
  } as Page;
}

describe("groupPagesForLibrary", () => {
  it("excludes trashed + database rows from every section", () => {
    const pages = [
      mk("a"),
      mk("b", { trashed: true }),
      mk("c", { rowOfDatabaseId: "db1" }),
    ];
    const sections = groupPagesForLibrary({ pages, recentIds: ["a", "b", "c"] });
    for (const s of sections) {
      expect(s.pages.every((p) => p.id === "a")).toBe(true);
    }
  });

  it("recents preserves recentIds order, dedupes, caps to recentLimit", () => {
    const pages = [mk("a"), mk("b"), mk("c"), mk("d")];
    const out = groupPagesForLibrary({
      pages,
      recentIds: ["c", "a", "c", "b", "d"],
      recentLimit: 3,
    });
    const recents = out.find((s) => s.key === "recents")!;
    expect(recents.pages.map((p) => p.id)).toEqual(["c", "a", "b"]);
  });

  it("favorites = only favorite=true", () => {
    const pages = [mk("a", { favorite: true }), mk("b"), mk("c", { favorite: true })];
    const out = groupPagesForLibrary({ pages, recentIds: [] });
    const fav = out.find((s) => s.key === "favorites")!;
    expect(fav.pages.map((p) => p.id).sort()).toEqual(["a", "c"]);
  });

  it("shared = only isPublic=true", () => {
    const pages = [mk("a", { isPublic: true }), mk("b"), mk("c", { isPublic: true })];
    const out = groupPagesForLibrary({ pages, recentIds: [] });
    const sh = out.find((s) => s.key === "shared")!;
    expect(sh.pages.map((p) => p.id).sort()).toEqual(["a", "c"]);
  });

  it("private = top-level non-public", () => {
    const pages = [
      mk("a"), // private root
      mk("b", { parentId: "a" }), // nested → not in private
      mk("c", { isPublic: true }), // public → not in private
      mk("d"), // private root
    ];
    const out = groupPagesForLibrary({ pages, recentIds: [] });
    const priv = out.find((s) => s.key === "private")!;
    expect(priv.pages.map((p) => p.id).sort()).toEqual(["a", "d"]);
  });

  it("favorites/shared/private are sorted by updatedAt desc", () => {
    const pages = [
      mk("a", { favorite: true, updatedAt: 100 }),
      mk("b", { favorite: true, updatedAt: 300 }),
      mk("c", { favorite: true, updatedAt: 200 }),
    ];
    const out = groupPagesForLibrary({ pages, recentIds: [] });
    const fav = out.find((s) => s.key === "favorites")!;
    expect(fav.pages.map((p) => p.id)).toEqual(["b", "c", "a"]);
  });

  it("returns four tab buckets in canonical order", () => {
    const out = groupPagesForLibrary({ pages: [], recentIds: [] });
    expect(out.map((s) => s.key)).toEqual([
      "recents", "favorites", "shared", "private",
    ]);
  });
});

describe("pageSource", () => {
  function mkDb(id: string, patch: Partial<Database> = {}): Database {
    return {
      id,
      name: id,
      icon: "🗂️",
      properties: [],
      rowIds: [],
      views: [],
      activeViewId: "v1",
      createdAt: 0,
      updatedAt: 0,
      defaultTemplateId: null,
      subItemsParentPropId: null,
      trashed: false,
      ...patch,
    } as Database;
  }

  it("returns root for top-level page", () => {
    const p = mk("a");
    const src = pageSource(p, [p], []);
    expect(src.kind).toBe("root");
    expect(src.label).toBe("Root");
    expect(src.targetId).toBeNull();
  });

  it("returns parent page for nested page", () => {
    const root = mk("root", { title: "Projects", icon: "📁" });
    const child = mk("child", { parentId: "root" });
    const src = pageSource(child, [root, child], []);
    expect(src).toEqual({ kind: "page", label: "Projects", icon: "📁", targetId: "root" });
  });

  it("returns database for db row", () => {
    const db = mkDb("db1", { name: "Tasks", icon: "✅" });
    const row = mk("r1", { rowOfDatabaseId: "db1" });
    const src = pageSource(row, [row], [db]);
    expect(src).toEqual({ kind: "database", label: "Tasks", icon: "✅", targetId: "db1" });
  });

  it("falls back to root when parent or db is missing", () => {
    const orphan = mk("o", { parentId: "ghost" });
    expect(pageSource(orphan, [orphan], []).kind).toBe("root");
    const lostRow = mk("r", { rowOfDatabaseId: "ghost" });
    expect(pageSource(lostRow, [lostRow], []).kind).toBe("root");
  });

  it("uses Untitled placeholder for empty parent title / db name", () => {
    const root = mk("root", { title: "" });
    const child = mk("child", { parentId: "root" });
    expect(pageSource(child, [root, child], []).label).toBe("Untitled");
    const db = mkDb("db", { name: "" });
    const row = mk("r", { rowOfDatabaseId: "db" });
    expect(pageSource(row, [row], [db]).label).toBe("Untitled database");
  });
});

describe("pageBreadcrumb", () => {
  it("walks parent chain", () => {
    const root = mk("root", { title: "Projects" });
    const child = mk("child", { parentId: "root", title: "App" });
    const leaf = mk("leaf", { parentId: "child", title: "Auth" });
    expect(pageBreadcrumb(leaf, [root, child, leaf], "Workspace")).toBe(
      "Workspace › Projects › App",
    );
  });

  it("survives missing parent", () => {
    const orphan = mk("o", { parentId: "ghost", title: "Orphan" });
    expect(pageBreadcrumb(orphan, [orphan], "WS")).toBe("WS");
  });

  it("survives parent cycles (no infinite loop)", () => {
    const a = mk("a", { parentId: "b", title: "A" });
    const b = mk("b", { parentId: "a", title: "B" });
    const out = pageBreadcrumb(a, [a, b]);
    // Cycle break: walked one parent before detection.
    expect(out.length).toBeGreaterThan(0);
  });
});
