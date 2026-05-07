import { describe, expect, it } from "vitest";
import { collectDescendants, type PageTreeNode } from "./pageTree";

const make = (id: string, parentId: string | null): PageTreeNode =>
  ({ _id: id as PageTreeNode["_id"], parentId });

describe("collectDescendants", () => {
  it("returns just the root when it has no children", () => {
    const pages = [make("a", null), make("b", null)];
    expect(collectDescendants(pages, "a")).toEqual(["a"]);
  });

  it("includes direct children", () => {
    const pages = [make("a", null), make("b", "a"), make("c", "a")];
    expect(collectDescendants(pages, "a").sort()).toEqual(["a", "b", "c"]);
  });

  it("recurses into grandchildren", () => {
    const pages = [
      make("root", null),
      make("child", "root"),
      make("grand", "child"),
      make("great", "grand"),
    ];
    expect(collectDescendants(pages, "root").sort()).toEqual(
      ["child", "grand", "great", "root"],
    );
  });

  it("ignores siblings of the root", () => {
    const pages = [
      make("a", null),
      make("b", null),
      make("a-child", "a"),
      make("b-child", "b"),
    ];
    expect(collectDescendants(pages, "a").sort()).toEqual(["a", "a-child"]);
  });

  it("does not loop on parent cycle", () => {
    // Corrupt data: a → b → a. Helper must terminate.
    const pages = [make("a", "b"), make("b", "a")];
    const result = collectDescendants(pages, "a");
    expect(result.sort()).toEqual(["a", "b"]);
  });

  it("handles a page that points to its own id as parent", () => {
    const pages = [make("a", "a")];
    expect(collectDescendants(pages, "a")).toEqual(["a"]);
  });

  it("returns root only if root id not present in pages", () => {
    const pages = [make("a", null)];
    expect(collectDescendants(pages, "missing")).toEqual(["missing"]);
  });
});
