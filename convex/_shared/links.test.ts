import { describe, expect, it } from "vitest";
import {
  extractEdges,
  slug,
  titleKeyFor,
  type RawEdge,
} from "./links";
import {
  extractEdgesFromBlocks,
  type ExtractedEdge,
} from "@/shared/lib/graphLinks";
import type { Block } from "@/shared/types/domain";

/** Fixture exercising all 4 edge kinds across text, caption, tableRows,
 *  nested children, and columns. */
const fixture = [
  {
    id: "b1",
    type: "paragraph",
    text: "See [[Design Doc]] then [alias](/dashboard/p/abcd1234) and #project/alpha",
  },
  { id: "b2", type: "page", pageId: "child_pg_01", text: "" },
  {
    id: "b3",
    type: "toggle",
    children: [
      { id: "b3a", type: "paragraph", text: "nested [[Roadmap]] with #todo" },
    ],
  },
  {
    id: "b4",
    type: "columns2",
    columns: [
      [{ id: "c1", type: "paragraph", text: "col mention [ref](/p/wxyz9999)" }],
      [{ id: "c2", type: "paragraph", text: "second col #done" }],
    ],
  },
  {
    id: "b5",
    type: "table",
    tableRows: [["cell [[Glossary]]", "tagged #tag2"]],
  },
  {
    id: "b6",
    type: "paragraph",
    text: "caption test",
    caption: "cap [[Appendix]]",
  },
];

function sortEdges<T extends RawEdge | ExtractedEdge>(edges: T[]): T[] {
  const key = (e: RawEdge | ExtractedEdge) =>
    `${e.kind}|${e.targetPageId ?? ""}|${e.targetTitle ?? ""}|${e.tag ?? ""}|${e.blockId ?? ""}`;
  return [...edges].sort((a, b) => key(a).localeCompare(key(b)));
}

describe("slug / titleKey", () => {
  it("lowercases, collapses non-alnum runs, trims dashes", () => {
    expect(slug("Design Doc")).toBe("design-doc");
    expect(slug("  Hello,  World!! ")).toBe("hello-world");
    expect(slug("a/b")).toBe("a-b");
    expect(slug("")).toBe("");
  });
  it("titleKeyFor aliases slug", () => {
    expect(titleKeyFor("Design Doc")).toBe(slug("Design Doc"));
  });
});

describe("extractEdges (server)", () => {
  const edges = extractEdges(fixture);
  const byKind = (k: string) => edges.filter((e) => e.kind === k);

  it("finds all wikilinks (incl. caption + tableRows + nested)", () => {
    expect(byKind("wikilink").map((e) => e.targetTitle).sort()).toEqual(
      ["Appendix", "Design Doc", "Glossary", "Roadmap"].sort(),
    );
  });
  it("finds mentions on both /p/ and /dashboard/p/ forms", () => {
    expect(byKind("mention").map((e) => e.targetPageId).sort()).toEqual(
      ["abcd1234", "wxyz9999"].sort(),
    );
  });
  it("finds page-block child pages", () => {
    expect(byKind("page-block").map((e) => e.targetPageId)).toEqual([
      "child_pg_01",
    ]);
  });
  it("finds tags incl. nested paths (from text + columns + tableRows)", () => {
    expect(byKind("tag").map((e) => e.tag).sort()).toEqual(
      ["done", "project/alpha", "tag2", "todo"].sort(),
    );
  });
  it("carries blockId for backlink previews", () => {
    const dd = byKind("wikilink").find((e) => e.targetTitle === "Design Doc");
    expect(dd?.blockId).toBe("b1");
    const glossary = byKind("wikilink").find(
      (e) => e.targetTitle === "Glossary",
    );
    expect(glossary?.blockId).toBe("b5");
  });
  it("is defensive over non-array / empty input", () => {
    expect(extractEdges(undefined)).toEqual([]);
    expect(extractEdges(null)).toEqual([]);
    expect(extractEdges("nope")).toEqual([]);
    expect(extractEdges([])).toEqual([]);
  });
  it("de-duplicates identical links in the same block", () => {
    const dup = extractEdges([
      { id: "x", type: "paragraph", text: "[[Same]] and [[Same]] again" },
    ]);
    expect(dup.filter((e) => e.targetTitle === "Same")).toHaveLength(1);
  });
});

describe("parity: server extractEdges === client extractEdgesFromBlocks", () => {
  it("produces identical edges on the fixture", () => {
    const server = sortEdges(extractEdges(fixture));
    const client = sortEdges(extractEdgesFromBlocks(fixture as unknown as Block[]));
    expect(client).toEqual(server);
  });

  it("stays identical on an empty page", () => {
    expect(
      sortEdges(extractEdgesFromBlocks([] as Block[])),
    ).toEqual(sortEdges(extractEdges([])));
  });

  it("stays identical with deeply nested columns + children", () => {
    const nested = [
      {
        id: "root",
        type: "columns2",
        columns: [
          [
            {
              id: "n1",
              type: "toggle",
              text: "outer [[One]] #x",
              children: [
                { id: "n2", type: "paragraph", text: "inner [[Two]] [m](/p/aaaa1111)" },
              ],
            },
          ],
          [{ id: "n3", type: "page", pageId: "pg_deep_99", text: "#y" }],
        ],
      },
    ];
    const server = sortEdges(extractEdges(nested));
    const client = sortEdges(
      extractEdgesFromBlocks(nested as unknown as Block[]),
    );
    expect(client).toEqual(server);
    // sanity: it actually found the nested signals
    expect(server.length).toBeGreaterThanOrEqual(5);
  });
});
