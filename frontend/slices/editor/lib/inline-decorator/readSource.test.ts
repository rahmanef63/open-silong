import { describe, it, expect } from "vitest";
import { decorateInPlace } from "../inlineDecorator";
import { stripTrailingChipFillerBr } from "./readSource";

/** Build the block DOM the decorator would produce for `source`. jsdom's
 *  `el.innerText` is unimplemented (returns undefined), so these tests pass the
 *  raw text a real browser would report explicitly and assert on the pure
 *  string+DOM logic. */
function mkBlock(source: string): HTMLElement {
  const host = document.createElement("div");
  decorateInPlace(host, source);
  return host;
}

describe("stripTrailingChipFillerBr", () => {
  it("drops the fabricated trailing newline when a block ENDS in a mention chip", () => {
    const src = "See [Notes](/dashboard/p/abc123)";
    const host = mkBlock(src);
    // Chromium appends a filler <br> after the atomic chip so the caret has a
    // landing spot; innerText then reports a trailing "\n". jsdom does not, so
    // we simulate the browser's DOM + the string it would return.
    host.appendChild(document.createElement("br"));
    expect(stripTrailingChipFillerBr(host, src + "\n")).toBe(src);
  });

  it("handles a bare mention chip with no leading text", () => {
    const src = "[Notes](/dashboard/p/abc123)";
    const host = mkBlock(src);
    host.appendChild(document.createElement("br"));
    expect(stripTrailingChipFillerBr(host, src + "\n")).toBe(src);
  });

  it("does not touch a block whose mention is NOT at the end", () => {
    const src = "[Notes](/dashboard/p/abc123) tail";
    const host = mkBlock(src);
    expect(stripTrailingChipFillerBr(host, src)).toBe(src);
  });

  it("preserves an intentional trailing soft break (shift+enter) after text", () => {
    // "line one\n" → DOM: [text, <br>]; the <br>'s prev sibling is a text node,
    // not a contenteditable=false chip, so it is a real soft break, kept as-is.
    const host = mkBlock("line one\n");
    expect(stripTrailingChipFillerBr(host, "line one\n")).toBe("line one\n");
  });

  it("preserves multiple intentional trailing breaks after a mention", () => {
    // "[X](url)\n\n" → DOM: [chip, <br>, <br>]; the last <br>'s prev sibling is
    // another <br>, not the chip, so the extra soft line is intentional.
    const src = "[X](/dashboard/p/id1)\n\n";
    const host = mkBlock(src);
    expect(stripTrailingChipFillerBr(host, src)).toBe(src);
  });

  it("is a no-op when the source has no trailing newline", () => {
    const src = "[X](/dashboard/p/id1)";
    const host = mkBlock(src);
    expect(stripTrailingChipFillerBr(host, src)).toBe(src);
  });
});
