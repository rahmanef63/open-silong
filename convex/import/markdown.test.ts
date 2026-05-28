import { describe, expect, it } from "vitest";
import { markdownToBlocks, htmlToBlocks, parseCsv } from "./markdown";

const types = (md: string) => markdownToBlocks(md).map((b) => b.type);

describe("import markdownToBlocks", () => {
  it("headings h1-h3 (h4+ falls to paragraph since no rule)", () => {
    const b = markdownToBlocks("# A\n## B\n### C");
    expect(b.map((x) => x.type)).toEqual(["h1", "h2", "h3"]);
    expect(b[0].text).toBe("A");
  });
  it("todo checked/unchecked, bullet, numbered, quote", () => {
    const b = markdownToBlocks("- [ ] a\n- [x] b\n- c\n1. d\n> e");
    expect(b.map((x) => x.type)).toEqual(["todo", "todo", "bullet", "numbered", "quote"]);
    expect(b[0].checked).toBe(false);
    expect(b[1].checked).toBe(true);
    expect(b[4].text).toBe("e");
  });
  it("code fence captures lang + body, skips closing", () => {
    const b = markdownToBlocks("```js\nconst x=1;\n```\nafter");
    expect(b[0]).toMatchObject({ type: "code", lang: "js", text: "const x=1;" });
    expect(b[1]).toMatchObject({ type: "paragraph", text: "after" });
  });
  it("divider variants", () => {
    expect(types("---\n***\n___")).toEqual(["divider", "divider", "divider"]);
  });
  it("image ![alt](url)", () => {
    const b = markdownToBlocks("![cap](http://x/y.png)");
    expect(b[0]).toMatchObject({ type: "image", url: "http://x/y.png", caption: "cap" });
  });
  it("paragraph collects consecutive plain lines, joined by space", () => {
    const b = markdownToBlocks("line one\nline two\nline three");
    expect(b).toHaveLength(1);
    expect(b[0]).toMatchObject({ type: "paragraph", text: "line one line two line three" });
  });
  it("paragraph breaks at a block-start line", () => {
    const b = markdownToBlocks("para text\n## heading");
    expect(b.map((x) => x.type)).toEqual(["paragraph", "h2"]);
  });
  it("empty / whitespace → single empty paragraph", () => {
    expect(markdownToBlocks("")).toEqual([expect.objectContaining({ type: "paragraph", text: "" })]);
    expect(markdownToBlocks("\n\n")).toEqual([expect.objectContaining({ type: "paragraph", text: "" })]);
  });
  it("CRLF normalized", () => {
    expect(types("# h\r\n- b")).toEqual(["h1", "bullet"]);
  });
});

describe("import htmlToBlocks", () => {
  it("heading tags → headings", () => {
    const b = htmlToBlocks("<h1>Title</h1><h2>Sub</h2><h3>Sub3</h3>");
    expect(b.map((x) => x.type)).toEqual(["h1", "h2", "h3"]);
    expect(b[0].text).toBe("Title");
  });
  it("list items → bullets", () => {
    const b = htmlToBlocks("<ul><li>one</li><li>two</li></ul>");
    expect(b.map((x) => x.type)).toEqual(["bullet", "bullet"]);
    expect(b[0].text).toBe("one");
  });
  it("paragraph + blockquote + hr", () => {
    const b = htmlToBlocks("<p>body</p><blockquote>quoted</blockquote><hr>");
    expect(b.find((x) => x.type === "quote")?.text).toBe("quoted");
    expect(b.some((x) => x.type === "divider")).toBe(true);
  });
  it("img with + without alt", () => {
    const withAlt = htmlToBlocks(`<img src="a.png" alt="Cap">`);
    expect(withAlt[0]).toMatchObject({ type: "image", url: "a.png", caption: "Cap" });
    const noAlt = htmlToBlocks(`<img src="b.png">`);
    expect(noAlt[0]).toMatchObject({ type: "image", url: "b.png", caption: "" });
  });
  it("strips script/style/comments", () => {
    const b = htmlToBlocks(`<script>evil()</script><style>x{}</style><!-- c --><p>safe</p>`);
    const text = b.map((x) => x.text).join(" ");
    expect(text).not.toContain("evil");
    expect(text).not.toContain("x{}");
    expect(text).toContain("safe");
  });
  it("decodes HTML entities", () => {
    const b = htmlToBlocks("<p>a &amp; b &lt; c &gt; d &quot;e&quot; &#39;f&#39; &nbsp;g</p>");
    expect(b[0].text).toBe(`a & b < c > d "e" 'f'  g`);
  });
});

describe("import parseCsv", () => {
  it("simple rows", () => {
    expect(parseCsv("a,b,c\n1,2,3")).toEqual([["a", "b", "c"], ["1", "2", "3"]]);
  });
  it("quoted field with embedded comma", () => {
    expect(parseCsv(`name,note\n"a, b",x`)).toEqual([["name", "note"], ["a, b", "x"]]);
  });
  it('escaped doubled-quote inside a quoted field', () => {
    expect(parseCsv(`"say ""hi""",end`)).toEqual([[`say "hi"`, "end"]]);
  });
  it("embedded newline inside quoted field", () => {
    expect(parseCsv(`"line1\nline2",x`)).toEqual([["line1\nline2", "x"]]);
  });
  it("CRLF normalized to row breaks", () => {
    expect(parseCsv("a,b\r\n1,2")).toEqual([["a", "b"], ["1", "2"]]);
  });
  it("trailing field with no newline is captured", () => {
    expect(parseCsv("a,b,c")).toEqual([["a", "b", "c"]]);
  });
  it("blank rows filtered out", () => {
    expect(parseCsv("a,b\n\n\n1,2\n   ,  ")).toEqual([["a", "b"], ["1", "2"]]);
  });
  it("round-trips a simple databaseToCsv-style body", () => {
    // mirrors the exporter: header + CRLF + quoted cell
    const csv = `Title,Note\r\n"has, comma","line1\nline2"`;
    expect(parseCsv(csv)).toEqual([["Title", "Note"], ["has, comma", "line1\nline2"]]);
  });
});
