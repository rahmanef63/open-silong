import { describe, it, expect } from "vitest";
import { groupPagesForLibrary, pageBreadcrumb } from "../lib/groupPages";
import type { Page } from "@/shared/types/domain";

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

  it("all is sorted by updatedAt desc", () => {
    const pages = [
      mk("a", { updatedAt: 100 }),
      mk("b", { updatedAt: 300 }),
      mk("c", { updatedAt: 200 }),
    ];
    const out = groupPagesForLibrary({ pages, recentIds: [] });
    const all = out.find((s) => s.key === "all")!;
    expect(all.pages.map((p) => p.id)).toEqual(["b", "c", "a"]);
  });

  it("returns five sections in canonical order", () => {
    const out = groupPagesForLibrary({ pages: [], recentIds: [] });
    expect(out.map((s) => s.key)).toEqual([
      "recents", "favorites", "shared", "private", "all",
    ]);
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
