import { describe, expect, it } from "vitest";
import type { Block, Page } from "../types/domain";
import { blockToHtml, pageToHtml, pageToHtmlFragment } from "./html";

// Loose helper — accepts any `type` string (incl. the unknown-type
// fallback case) without fighting the Block["type"] union.
const blk = (o: Record<string, unknown> & { type: string }): Block => o as unknown as Block;

describe("html blockToHtml — text blocks + escaping", () => {
  it("escapes &, <, >, \"", () => {
    expect(blockToHtml(blk({ type: "paragraph", text: `a & b < c > d "e"` })))
      .toBe(`<p>a &amp; b &lt; c &gt; d &quot;e&quot;</p>`);
  });
  it("h1..h4", () => {
    expect(blockToHtml(blk({ type: "h1", text: "A" }))).toBe("<h1>A</h1>");
    expect(blockToHtml(blk({ type: "h4", text: "D" }))).toBe("<h4>D</h4>");
  });
  it("quote + callout (💡 prefix)", () => {
    expect(blockToHtml(blk({ type: "quote", text: "q" }))).toBe("<blockquote>q</blockquote>");
    expect(blockToHtml(blk({ type: "callout", text: "c" }))).toBe("<blockquote>💡 c</blockquote>");
  });
});

describe("html blockToHtml — lists", () => {
  it("todo checked/unchecked", () => {
    expect(blockToHtml(blk({ type: "todo", text: "t", checked: true }))).toBe("<ul><li>[x] t</li></ul>");
    expect(blockToHtml(blk({ type: "todo", text: "t", checked: false }))).toBe("<ul><li>[ ] t</li></ul>");
  });
  it("bullet / numbered", () => {
    expect(blockToHtml(blk({ type: "bullet", text: "b" }))).toBe("<ul><li>b</li></ul>");
    expect(blockToHtml(blk({ type: "numbered", text: "n" }))).toBe("<ol><li>n</li></ol>");
  });
});

describe("html blockToHtml — code + equation + divider", () => {
  it("code with language class", () => {
    expect(blockToHtml(blk({ type: "code", text: "x=1", lang: "py" })))
      .toBe(`<pre><code class="lang-py">x=1</code></pre>`);
  });
  it("code without language", () => {
    expect(blockToHtml(blk({ type: "code", text: "x" }))).toBe("<pre><code>x</code></pre>");
  });
  it("code body is escaped", () => {
    expect(blockToHtml(blk({ type: "code", text: "a < b" }))).toContain("a &lt; b");
  });
  it("equation wraps in $$", () => {
    expect(blockToHtml(blk({ type: "equation", text: "x^2" }))).toBe("<pre>$$x^2$$</pre>");
  });
  it("divider", () => {
    expect(blockToHtml(blk({ type: "divider" }))).toBe("<hr>");
  });
});

describe("html blockToHtml — media", () => {
  it("image with caption → figure + figcaption", () => {
    expect(blockToHtml(blk({ type: "image", url: "x.png", caption: "Cap" })))
      .toBe(`<figure><img src="x.png" alt="Cap"><figcaption>Cap</figcaption></figure>`);
  });
  it("image without caption → empty alt, no figcaption", () => {
    expect(blockToHtml(blk({ type: "image", url: "x.png" })))
      .toBe(`<figure><img src="x.png" alt=""></figure>`);
  });
  it("image without url → empty string", () => {
    expect(blockToHtml(blk({ type: "image" }))).toBe("");
  });
  it("audio / video with + without url", () => {
    expect(blockToHtml(blk({ type: "audio", url: "a.mp3" }))).toBe(`<audio controls src="a.mp3"></audio>`);
    expect(blockToHtml(blk({ type: "audio" }))).toBe("");
    expect(blockToHtml(blk({ type: "video", url: "v.mp4" }))).toBe(`<video controls src="v.mp4"></video>`);
  });
  it("embed link + empty", () => {
    expect(blockToHtml(blk({ type: "embed", url: "http://x" }))).toContain(`href="http://x"`);
    expect(blockToHtml(blk({ type: "embed" }))).toBe("");
  });
  it("button uses url or # fallback + default label", () => {
    expect(blockToHtml(blk({ type: "button", text: "Go", url: "/x" } as never))).toBe(`<p><a class="button" href="/x">Go</a></p>`);
    expect(blockToHtml(blk({ type: "button" }))).toBe(`<p><a class="button" href="#">Button</a></p>`);
  });
});

describe("html blockToHtml — table + page link", () => {
  it("table splits rows (\\n) + cells (|)", () => {
    expect(blockToHtml(blk({ type: "table", text: "a | b\nc | d" })))
      .toBe("<table><tr><td>a</td><td>b</td></tr><tr><td>c</td><td>d</td></tr></table>");
  });
  it("page → anchor with pageId, default label", () => {
    expect(blockToHtml(blk({ type: "page", text: "Child", pageId: "p1" } as never)))
      .toBe(`<p><a href="#page-p1">Child</a></p>`);
    expect(blockToHtml(blk({ type: "page", pageId: "p2" } as never))).toContain("Subpage");
  });
});

describe("html blockToHtml — recursive (toggle, columns)", () => {
  it("toggle renders summary + children", () => {
    const b = blk({ type: "toggle", text: "Head", children: [blk({ type: "paragraph", text: "inner" })] });
    expect(blockToHtml(b)).toBe("<details><summary>Head</summary><p>inner</p></details>");
  });
  it("columns wrap each column's blocks", () => {
    const b = blk({
      type: "columns2",
      columns: [[blk({ type: "paragraph", text: "L" })], [blk({ type: "paragraph", text: "R" })]],
    } as never);
    expect(blockToHtml(b))
      .toBe(`<div class="columns"><div class="column"><p>L</p></div><div class="column"><p>R</p></div></div>`);
  });
  it("synced renders inline; toc renders empty", () => {
    expect(blockToHtml(blk({ type: "synced", text: "s" }))).toBe(`<div class="synced">s</div>`);
    expect(blockToHtml(blk({ type: "toc" }))).toBe("");
  });
  it("unknown type falls back to paragraph", () => {
    expect(blockToHtml(blk({ type: "mystery_block", text: "x" }))).toBe("<p>x</p>");
  });
});

describe("html pageToHtml / pageToHtmlFragment", () => {
  const page = (o: Partial<Page>): Page => ({
    id: "p", parentId: null, title: "", icon: "", blocks: [],
    favorite: false, trashed: false, createdAt: 0, updatedAt: 0, ...o,
  });

  it("full doc has doctype, escaped title, body, and styles by default", () => {
    const html = pageToHtml(page({ title: "My <Page>", blocks: [blk({ type: "paragraph", text: "hi" })] }));
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain("<title>My &lt;Page&gt;</title>");
    expect(html).toContain("<style>");
    expect(html).toContain("<p>hi</p>");
  });
  it("includeStyles=false omits the <style> block", () => {
    const html = pageToHtml(page({ title: "T" }), false);
    expect(html).not.toContain("<style>");
  });
  it("untitled fallback", () => {
    expect(pageToHtml(page({}))).toContain("<title>Untitled</title>");
  });
  it("fragment omits html/head, keeps h1 + body", () => {
    const frag = pageToHtmlFragment(page({ title: "F", blocks: [blk({ type: "bullet", text: "b" })] }));
    expect(frag.startsWith("<h1>F</h1>")).toBe(true);
    expect(frag).not.toContain("<!doctype");
    expect(frag).toContain("<ul><li>b</li></ul>");
  });
});
