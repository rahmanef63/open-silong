import { describe, expect, it } from "vitest";
import type { Block } from "../types";
import { blockToMarkdown, markdownToBlocks } from "./markdown";

/** Round-trip property test: blockToMarkdown (export) → markdownToBlocks
 *  (import) must preserve type + text for the cleanly-round-trippable
 *  block subset. Catches drift between the two parsers (tested separately
 *  elsewhere) — e.g. if export changes a marker the importer no longer
 *  recognizes. Seeded PRNG; text restricted to [a-z ] so it carries no
 *  markdown-significant chars that would reparse differently. */

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const blk = (o: Record<string, unknown> & { type: string }): Block => o as unknown as Block;

const word = (rng: () => number, n: number) => {
  const alpha = "abcdefghijklmnopqrstuvwxyz";
  let s = "";
  for (let i = 0; i < n; i++) s += alpha[Math.floor(rng() * alpha.length)];
  return s;
};
const phrase = (rng: () => number) => {
  const words = 1 + Math.floor(rng() * 4);
  return Array.from({ length: words }, () => word(rng, 1 + Math.floor(rng() * 7))).join(" ");
};

/** Block types that survive export→import with type + text intact. */
const ROUND_TRIPPABLE = ["paragraph", "h1", "h2", "h3", "bullet", "numbered", "quote"] as const;

describe("markdown round-trip — single block preserves type + text", () => {
  it("export→import is identity on the clean subset", () => {
    const rng = mulberry32(42);
    for (let i = 0; i < 300; i++) {
      const type = ROUND_TRIPPABLE[Math.floor(rng() * ROUND_TRIPPABLE.length)];
      const text = phrase(rng);
      const md = blockToMarkdown(blk({ type, text }));
      const back = markdownToBlocks(md);
      expect(back).toHaveLength(1);
      expect(back[0].type).toBe(type);
      expect(back[0].text).toBe(text);
    }
  });

  it("todo preserves checked state", () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 100; i++) {
      const checked = rng() > 0.5;
      const text = phrase(rng);
      const md = blockToMarkdown(blk({ type: "todo", text, checked }));
      const back = markdownToBlocks(md);
      expect(back[0].type).toBe("todo");
      expect(back[0].text).toBe(text);
      expect(!!back[0].checked).toBe(checked);
    }
  });

  it("code preserves text + language", () => {
    const rng = mulberry32(9);
    for (let i = 0; i < 100; i++) {
      const lang = ["js", "ts", "py", ""][Math.floor(rng() * 4)];
      const text = `${phrase(rng)}\n${phrase(rng)}`;
      const md = blockToMarkdown(blk({ type: "code", text, lang }));
      const back = markdownToBlocks(md);
      expect(back[0].type).toBe("code");
      expect(back[0].text).toBe(text);
      if (lang) expect(back[0].lang).toBe(lang);
    }
  });

  it("divider round-trips", () => {
    const back = markdownToBlocks(blockToMarkdown(blk({ type: "divider", text: "" })));
    expect(back[0].type).toBe("divider");
  });
});

describe("markdown round-trip — multi-block document", () => {
  it("blocks joined by blank lines re-parse to the same type sequence", () => {
    const rng = mulberry32(123);
    for (let run = 0; run < 50; run++) {
      const n = 2 + Math.floor(rng() * 5);
      const blocks = Array.from({ length: n }, () =>
        blk({ type: ROUND_TRIPPABLE[Math.floor(rng() * ROUND_TRIPPABLE.length)], text: phrase(rng) }),
      );
      // mirror pageToMarkdown's block separator
      const md = blocks.map((b) => blockToMarkdown(b)).join("\n\n");
      const back = markdownToBlocks(md);
      expect(back.map((b) => b.type)).toEqual(blocks.map((b) => b.type));
      expect(back.map((b) => b.text)).toEqual(blocks.map((b) => b.text));
    }
  });
});
