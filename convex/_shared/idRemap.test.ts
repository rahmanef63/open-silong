import { describe, it, expect } from "vitest";
import {
  rewriteMentions,
  rewriteMentionsInBlocks,
  remapBlockRefs,
  importBlockTree,
  remapPropertyXRefs,
  remapRowProps,
  remapTemplates,
} from "./idRemap";
import type { BlockLike } from "./blocks";

const pageMap = new Map([["src1", "tgt1"], ["src2", "tgt2"]]);
const dbMap = new Map([["db_src", "db_tgt"]]);

describe("rewriteMentions", () => {
  it("rewrites mention with known source id", () => {
    expect(rewriteMentions("see [Notes](/p/src1) here", pageMap)).toBe("see [Notes](/p/tgt1) here");
  });
  it("leaves unknown source id alone (no silent drop)", () => {
    expect(rewriteMentions("[X](/p/unknown)", pageMap)).toBe("[X](/p/unknown)");
  });
  it("handles multiple mentions in one string", () => {
    expect(rewriteMentions("[A](/p/src1) + [B](/p/src2)", pageMap))
      .toBe("[A](/p/tgt1) + [B](/p/tgt2)");
  });
  it("empty / no-mention strings short-circuit", () => {
    expect(rewriteMentions("", pageMap)).toBe("");
    expect(rewriteMentions("plain text", pageMap)).toBe("plain text");
  });
  it("does not match http(s) links", () => {
    expect(rewriteMentions("[X](https://x.com/p/src1)", pageMap))
      .toBe("[X](https://x.com/p/src1)");
  });
});

describe("rewriteMentionsInBlocks", () => {
  it("rewrites text + caption + table cells across nested children", () => {
    const blocks: BlockLike[] = [
      { id: "a", text: "[X](/p/src1)" },
      { id: "b", caption: "see [Y](/p/src2)" },
      { id: "c", tableRows: [["[A](/p/src1)", "plain"]] },
      {
        id: "d",
        children: [{ id: "d1", text: "nested [Z](/p/src2)" }],
        columns: [[{ id: "col0", text: "col [W](/p/src1)" }]],
      },
    ];
    rewriteMentionsInBlocks(blocks, pageMap);
    expect(blocks[0].text).toBe("[X](/p/tgt1)");
    expect(blocks[1].caption).toBe("see [Y](/p/tgt2)");
    expect(blocks[2].tableRows![0][0]).toBe("[A](/p/tgt1)");
    expect(blocks[3].children![0].text).toBe("nested [Z](/p/tgt2)");
    expect(blocks[3].columns![0][0].text).toBe("col [W](/p/tgt1)");
  });
});

describe("remapBlockRefs", () => {
  it("rewrites pageId + databaseId on the leaf and through children/columns", () => {
    const blocks: BlockLike[] = [
      { id: "p1", type: "page", pageId: "src1" },
      { id: "db1", type: "database", databaseId: "db_src" },
      { id: "tg", type: "toggle", children: [{ id: "ch", type: "page", pageId: "src2" }] },
      { id: "c2", type: "columns2", columns: [[{ id: "x", type: "database", databaseId: "db_src" }]] },
    ];
    const out = remapBlockRefs(blocks, { pageMap, dbMap });
    expect(out[0].pageId).toBe("tgt1");
    expect(out[1].databaseId).toBe("db_tgt");
    expect(out[2].children![0].pageId).toBe("tgt2");
    expect(out[3].columns![0][0].databaseId).toBe("db_tgt");
    expect(blocks[0].pageId).toBe("src1");
  });
});

describe("importBlockTree", () => {
  it("regens ids + remaps refs + rewrites mentions in one pass", () => {
    const blocks: BlockLike[] = [
      { id: "ORIG", type: "paragraph", text: "see [X](/p/src1)" },
      { id: "P", type: "page", pageId: "src2", children: [{ id: "C", text: "[Y](/p/src1)" }] },
    ];
    const out = importBlockTree(blocks, { pageMap, dbMap });
    expect(out[0].id).not.toBe("ORIG");
    expect(out[0].text).toBe("see [X](/p/tgt1)");
    expect(out[1].pageId).toBe("tgt2");
    expect(out[1].children![0].text).toBe("[Y](/p/tgt1)");
    expect(out[1].children![0].id).not.toBe("C");
  });
});

describe("remapPropertyXRefs", () => {
  it("rewrites relationDatabaseId", () => {
    const props = [{ id: "p1", type: "relation", relationDatabaseId: "db_src" }];
    expect(remapPropertyXRefs(props, { pageMap, dbMap })[0].relationDatabaseId).toBe("db_tgt");
  });
  it("rewrites button open_page actions", () => {
    const props = [{
      id: "p2", type: "button",
      buttonActions: [
        { kind: "open_page", pageId: "src1" },
        { kind: "open_url", url: "https://x.com" },
      ],
    }];
    const out = remapPropertyXRefs(props, { pageMap, dbMap });
    expect(out[0].buttonActions![0].pageId).toBe("tgt1");
    expect(out[0].buttonActions![1]).toEqual({ kind: "open_url", url: "https://x.com" });
  });
  it("leaves unknown ids alone", () => {
    const props = [{ id: "p3", type: "relation", relationDatabaseId: "unknown_db" }];
    expect(remapPropertyXRefs(props, { pageMap, dbMap })[0].relationDatabaseId).toBe("unknown_db");
  });
});

describe("remapRowProps", () => {
  it("rewrites relation arrays via pageMap", () => {
    const props = [{ id: "rel", type: "relation" }];
    const out = remapRowProps({ rel: ["src1", "src2", "ghost"] }, props, pageMap);
    expect(out!.rel).toEqual(["tgt1", "tgt2", "ghost"]);
  });
  it("clears person arrays (cross-workspace user ids meaningless)", () => {
    const props = [{ id: "ppl", type: "person" }];
    expect(remapRowProps({ ppl: ["u1", "u2"] }, props, pageMap)!.ppl).toEqual([]);
  });
  it("undefined rowProps short-circuits", () => {
    expect(remapRowProps(undefined, [], pageMap)).toBeUndefined();
  });
});

describe("remapTemplates", () => {
  it("rewrites template seed blocks", () => {
    const tpls = [{ id: "t1", name: "T", blocks: [{ id: "x", type: "paragraph", text: "[L](/p/src1)" }] }];
    const out = remapTemplates(tpls, { pageMap, dbMap }) as any[];
    expect(out[0].blocks[0].text).toBe("[L](/p/tgt1)");
    expect(out[0].blocks[0].id).not.toBe("x");
  });
  it("undefined templates pass through", () => {
    expect(remapTemplates(undefined, { pageMap, dbMap })).toBeUndefined();
  });
});
