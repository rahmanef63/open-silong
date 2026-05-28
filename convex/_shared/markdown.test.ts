import { describe, expect, it } from "vitest";
import { markdownToBlocks } from "./markdown";

/** ids are uid()-generated + non-deterministic; assert on type/text/flags. */
const types = (md: string) => markdownToBlocks(md).map((b) => b.type);

describe("markdownToBlocks — headings", () => {
  it("h1..h6 map to h{level}", () => {
    const b = markdownToBlocks("# A\n## B\n### C\n#### D\n##### E\n###### F");
    expect(b.map((x) => x.type)).toEqual(["h1", "h2", "h3", "h4", "h5", "h6"]);
    expect(b[0].text).toBe("A");
  });
});

describe("markdownToBlocks — code fences", () => {
  it("captures language + multi-line body", () => {
    const b = markdownToBlocks("```ts\nconst x = 1;\nconst y = 2;\n```");
    expect(b).toHaveLength(1);
    expect(b[0]).toMatchObject({ type: "code", lang: "ts", text: "const x = 1;\nconst y = 2;" });
  });
  it("unclosed fence at EOF still flushes as code", () => {
    const b = markdownToBlocks("```py\nx = 1");
    expect(b[0]).toMatchObject({ type: "code", lang: "py", text: "x = 1" });
  });
  it("content inside fence is NOT parsed as markdown", () => {
    const b = markdownToBlocks("```\n# not a heading\n- not a bullet\n```");
    expect(b).toHaveLength(1);
    expect(b[0].type).toBe("code");
    expect(b[0].text).toBe("# not a heading\n- not a bullet");
  });
});

describe("markdownToBlocks — dividers", () => {
  it("--- *** ___ all become divider", () => {
    expect(types("---\n***\n___")).toEqual(["divider", "divider", "divider"]);
  });
});

describe("markdownToBlocks — lists", () => {
  it("task list checked/unchecked", () => {
    const b = markdownToBlocks("- [ ] todo a\n- [x] done b\n* [X] done c");
    expect(b.map((x) => x.type)).toEqual(["todo", "todo", "todo"]);
    expect(b[0]).toMatchObject({ checked: false, text: "todo a" });
    expect(b[1]).toMatchObject({ checked: true, text: "done b" });
    expect(b[2]).toMatchObject({ checked: true, text: "done c" });
  });
  it("bullets with -, *, +", () => {
    expect(types("- a\n* b\n+ c")).toEqual(["bullet", "bullet", "bullet"]);
    expect(markdownToBlocks("- hello")[0].text).toBe("hello");
  });
  it("numbered", () => {
    const b = markdownToBlocks("1. first\n2. second");
    expect(b.map((x) => x.type)).toEqual(["numbered", "numbered"]);
    expect(b[0].text).toBe("first");
  });
  it("indent level derived from leading spaces (2 = 1, capped at 3)", () => {
    const b = markdownToBlocks("- a\n  - b\n        - deep");
    expect(b[0].indent).toBeUndefined();      // 0 spaces → no indent field
    expect(b[1].indent).toBe(1);              // 2 spaces
    expect(b[2].indent).toBe(3);              // 8 spaces → 4, capped at 3
  });
});

describe("markdownToBlocks — quotes + callouts", () => {
  it("quote line", () => {
    expect(markdownToBlocks("> quoted")[0]).toMatchObject({ type: "quote", text: "quoted" });
  });
  it("bare > is empty quote", () => {
    expect(markdownToBlocks(">")[0]).toMatchObject({ type: "quote", text: "" });
  });
  it("GFM admonition → callout with kind + joined body", () => {
    const b = markdownToBlocks("> [!WARNING]\n> line one\n> line two");
    expect(b).toHaveLength(1);
    expect(b[0]).toMatchObject({ type: "callout", calloutKind: "warning", text: "line one\nline two" });
  });
  it("admonition kind is case-insensitive", () => {
    expect(markdownToBlocks("> [!note]\n> x")[0]).toMatchObject({ calloutKind: "note" });
  });
});

describe("markdownToBlocks — tables", () => {
  it("header + separator + rows, alignment parsed", () => {
    const md = "| A | B | C |\n| :--- | :---: | ---: |\n| 1 | 2 | 3 |\n| 4 | 5 | 6 |";
    const b = markdownToBlocks(md);
    expect(b).toHaveLength(1);
    expect(b[0]).toMatchObject({
      type: "table",
      tableHeader: true,
      tableRows: [["A", "B", "C"], ["1", "2", "3"], ["4", "5", "6"]],
      tableAlign: ["left", "center", "right"],
    });
  });
  it("pads short rows to column count", () => {
    const md = "| A | B |\n| --- | --- |\n| 1 |";
    const b = markdownToBlocks(md);
    expect(b[0].tableRows).toEqual([["A", "B"], ["1", ""]]);
  });
  it("a pipe line WITHOUT a separator is a paragraph, not a table", () => {
    const b = markdownToBlocks("| not | a | table |\njust text");
    expect(b[0].type).toBe("paragraph");
  });
});

describe("markdownToBlocks — paragraphs + edge cases", () => {
  it("plain text → paragraph", () => {
    expect(markdownToBlocks("just words")[0]).toMatchObject({ type: "paragraph", text: "just words" });
  });
  it("blank lines are skipped", () => {
    expect(types("a\n\n\nb")).toEqual(["paragraph", "paragraph"]);
  });
  it("CRLF is normalized", () => {
    expect(types("# h\r\n- b")).toEqual(["h1", "bullet"]);
  });
  it("empty input → single empty paragraph (never empty array)", () => {
    const b = markdownToBlocks("");
    expect(b).toHaveLength(1);
    expect(b[0]).toMatchObject({ type: "paragraph", text: "" });
  });
  it("whitespace-only input → single empty paragraph", () => {
    expect(markdownToBlocks("   \n  \n")).toEqual([expect.objectContaining({ type: "paragraph", text: "" })]);
  });
  it("every block carries a generated id", () => {
    const b = markdownToBlocks("# h\ntext");
    expect(b.every((x) => typeof x.id === "string" && x.id.length > 0)).toBe(true);
  });
});
