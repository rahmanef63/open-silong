import { describe, expect, it } from "vitest";
import type { Block, Page } from "../types";
import { blockToMarkdown, pageToMarkdown, pageToPlainText } from "./markdown";

const blk = (o: Record<string, unknown> & { type: string }): Block => o as unknown as Block;
const page = (o: Partial<Page>): Page => ({
  id: "p", parentId: null, title: "", icon: "", blocks: [],
  favorite: false, trashed: false, createdAt: 0, updatedAt: 0, ...o,
});

describe("blockToMarkdown — headings + text", () => {
  it("h1..h6", () => {
    expect(blockToMarkdown(blk({ type: "h1", text: "A" }))).toBe("# A");
    expect(blockToMarkdown(blk({ type: "h6", text: "F" }))).toBe("###### F");
  });
  it("quote + synced + default fallback", () => {
    expect(blockToMarkdown(blk({ type: "quote", text: "q" }))).toBe("> q");
    expect(blockToMarkdown(blk({ type: "synced", text: "s" }))).toBe("s");
    expect(blockToMarkdown(blk({ type: "mystery", text: "m" }))).toBe("m");
  });
  it("toc → empty string", () => {
    expect(blockToMarkdown(blk({ type: "toc", text: "x" }))).toBe("");
  });
});

describe("blockToMarkdown — lists + indent", () => {
  it("todo checked/unchecked", () => {
    expect(blockToMarkdown(blk({ type: "todo", text: "t", checked: true }))).toBe("- [x] t");
    expect(blockToMarkdown(blk({ type: "todo", text: "t", checked: false }))).toBe("- [ ] t");
  });
  it("bullet / numbered", () => {
    expect(blockToMarkdown(blk({ type: "bullet", text: "b" }))).toBe("- b");
    expect(blockToMarkdown(blk({ type: "numbered", text: "n" }))).toBe("1. n");
  });
  it("indent stacks depth (container) + b.indent (list)", () => {
    // depth=1 → 2 spaces; b.indent=2 → 4 spaces; total 6
    expect(blockToMarkdown(blk({ type: "bullet", text: "deep", indent: 2 }), 1)).toBe("      - deep");
  });
});

describe("blockToMarkdown — callout", () => {
  it("default callout → 💡 prefix", () => {
    expect(blockToMarkdown(blk({ type: "callout", text: "hi" }))).toBe("> 💡 hi");
  });
  it("typed callout → [!KIND] + body lines", () => {
    expect(blockToMarkdown(blk({ type: "callout", text: "l1\nl2", calloutKind: "warning" })))
      .toBe("> [!WARNING]\n> l1\n> l2");
  });
});

describe("blockToMarkdown — code + equation + divider", () => {
  it("code fence with + without lang", () => {
    expect(blockToMarkdown(blk({ type: "code", text: "x=1", lang: "py" }))).toBe("```py\nx=1\n```");
    expect(blockToMarkdown(blk({ type: "code", text: "x" }))).toBe("```\nx\n```");
  });
  it("equation $$ wrap", () => {
    expect(blockToMarkdown(blk({ type: "equation", text: "E=mc^2" }))).toBe("$$\nE=mc^2\n$$");
  });
  it("divider", () => {
    expect(blockToMarkdown(blk({ type: "divider" }))).toBe("---");
  });
});

describe("blockToMarkdown — media", () => {
  it("image / audio / video / embed with url", () => {
    expect(blockToMarkdown(blk({ type: "image", url: "x.png", caption: "C" }))).toBe("![C](x.png)");
    expect(blockToMarkdown(blk({ type: "audio", url: "a.mp3" }))).toBe("[🔊 Audio](a.mp3)");
    expect(blockToMarkdown(blk({ type: "video", url: "v.mp4", caption: "Clip" }))).toBe("[🎬 Clip](v.mp4)");
    expect(blockToMarkdown(blk({ type: "embed", url: "http://x" }))).toBe("[http://x](http://x)");
  });
  it("media without url → empty", () => {
    expect(blockToMarkdown(blk({ type: "image" }))).toBe("");
    expect(blockToMarkdown(blk({ type: "audio" }))).toBe("");
  });
  it("button url/# fallback + default label", () => {
    expect(blockToMarkdown(blk({ type: "button", text: "Go", url: "/x" }))).toBe("[**Go**](/x)");
    expect(blockToMarkdown(blk({ type: "button" }))).toBe("[**Button**](#)");
  });
});

describe("blockToMarkdown — table", () => {
  it("tableRows with alignment separators + padding", () => {
    const b = blk({
      type: "table",
      tableRows: [["A", "B"], ["1"]],
      tableAlign: ["left", "right"],
    });
    expect(blockToMarkdown(b)).toBe("| A | B |\n| --- | ---: |\n| 1 |  |");
  });
  it("default alignment is left (---)", () => {
    const b = blk({ type: "table", tableRows: [["A"], ["1"]] });
    expect(blockToMarkdown(b)).toBe("| A |\n| --- |\n| 1 |");
  });
});

describe("blockToMarkdown — recursive", () => {
  it("toggle renders <details> + children at depth+1", () => {
    const b = blk({ type: "toggle", text: "Head", children: [blk({ type: "bullet", text: "kid" })] });
    expect(blockToMarkdown(b)).toBe("<details><summary>Head</summary>\n\n  - kid\n\n</details>");
  });
  it("columns flatten each column's blocks", () => {
    const b = blk({
      type: "columns2",
      columns: [[blk({ type: "paragraph", text: "L" })], [blk({ type: "paragraph", text: "R" })]],
    });
    expect(blockToMarkdown(b)).toBe("L\n\nR");
  });
  it("page link", () => {
    expect(blockToMarkdown(blk({ type: "page", text: "Child", pageId: "p1" }))).toBe("[📄 Child](#page-p1)");
  });
});

describe("pageToMarkdown / pageToPlainText", () => {
  it("pageToMarkdown adds title head + joins non-empty blocks", () => {
    const p = page({ title: "Doc", blocks: [blk({ type: "h2", text: "Sec" }), blk({ type: "toc" }), blk({ type: "paragraph", text: "body" })] });
    expect(pageToMarkdown(p)).toBe("# Doc\n\n## Sec\n\nbody");
  });
  it("untitled fallback", () => {
    expect(pageToMarkdown(page({}))).toBe("# Untitled\n\n");
  });
  it("pageToPlainText walks title + nested text (children + columns)", () => {
    const p = page({
      title: "T",
      blocks: [
        blk({ type: "paragraph", text: "top" }),
        blk({ type: "toggle", text: "tog", children: [blk({ type: "paragraph", text: "child" })] }),
        blk({ type: "columns2", columns: [[blk({ type: "paragraph", text: "col" })]] }),
      ],
    });
    expect(pageToPlainText(p)).toBe("T\ntop\ntog\nchild\ncol");
  });
  it("plain text skips blocks with no text", () => {
    const p = page({ title: "", blocks: [blk({ type: "divider" }), blk({ type: "paragraph", text: "x" })] });
    expect(pageToPlainText(p)).toBe("x");
  });
});
