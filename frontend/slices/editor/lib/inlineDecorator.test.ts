/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach } from "vitest";
import {
  decorateInPlace, decorateLineToFragment, getCaretOffset, setCaretAtOffset,
} from "./inlineDecorator";

function mkHost(): HTMLDivElement {
  const el = document.createElement("div");
  el.contentEditable = "true";
  document.body.appendChild(el);
  return el;
}

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("decorateInPlace", () => {
  it("renders plain text unchanged", () => {
    const el = mkHost();
    decorateInPlace(el, "hello world");
    expect(el.textContent).toBe("hello world");
    expect(el.querySelector("strong")).toBeNull();
  });

  it("wraps **bold** in <strong> with markers", () => {
    const el = mkHost();
    decorateInPlace(el, "say **hi** there");
    const strong = el.querySelector("strong");
    expect(strong).not.toBeNull();
    expect(strong!.textContent).toBe("hi");
    // Markers should still be visible in the source.
    expect(el.textContent).toBe("say **hi** there");
    // Two marker spans for bold.
    expect(el.querySelectorAll("[data-md-marker]").length).toBe(2);
  });

  it("wraps _italic_ in <em>", () => {
    const el = mkHost();
    decorateInPlace(el, "_word_");
    expect(el.querySelector("em")?.textContent).toBe("word");
    expect(el.textContent).toBe("_word_");
  });

  it("wraps ~~strike~~ in <del>", () => {
    const el = mkHost();
    decorateInPlace(el, "~~gone~~");
    expect(el.querySelector("del")?.textContent).toBe("gone");
    expect(el.textContent).toBe("~~gone~~");
  });

  it("wraps `code` in <code>", () => {
    const el = mkHost();
    decorateInPlace(el, "use `npm` ok");
    expect(el.querySelector("code")?.textContent).toBe("npm");
  });

  it("renders [label](url) link with dimmed url", () => {
    const el = mkHost();
    decorateInPlace(el, "see [docs](https://x.dev)");
    expect(el.textContent).toBe("see [docs](https://x.dev)");
  });

  it("multi-line: splits on newline with <br>", () => {
    const el = mkHost();
    decorateInPlace(el, "line1\nline2\nline3");
    expect(el.querySelectorAll("br").length).toBe(2);
    const text = el.textContent ?? "";
    expect(text.includes("line1")).toBe(true);
    expect(text.includes("line2")).toBe(true);
    expect(text.includes("line3")).toBe(true);
  });

  it("empty source produces empty host", () => {
    const el = mkHost();
    el.innerHTML = "<strong>old</strong>";
    decorateInPlace(el, "");
    expect(el.children.length).toBe(0);
    expect(el.textContent).toBe("");
  });

  it("idempotent: decorate twice yields same DOM structure", () => {
    const el = mkHost();
    decorateInPlace(el, "**a** _b_ ~~c~~");
    const html1 = el.innerHTML;
    decorateInPlace(el, "**a** _b_ ~~c~~");
    expect(el.innerHTML).toBe(html1);
  });
});

describe("caret offset utils", () => {
  it("setCaretAtOffset places caret at exact text-position in plain text", () => {
    const el = mkHost();
    decorateInPlace(el, "hello");
    el.focus();
    setCaretAtOffset(el, 3);
    expect(getCaretOffset(el)).toBe(3);
  });

  it("offset survives across <strong> boundaries", () => {
    const el = mkHost();
    decorateInPlace(el, "say **hi** there");
    el.focus();
    // Position 5 = inside the opening "**" markers (after "say  ")
    setCaretAtOffset(el, 5);
    expect(getCaretOffset(el)).toBe(5);
    // Position 9 = after "hi" inside strong
    setCaretAtOffset(el, 9);
    expect(getCaretOffset(el)).toBe(9);
  });

  it("setCaretAtOffset clamps to end when offset exceeds length", () => {
    const el = mkHost();
    decorateInPlace(el, "abc");
    el.focus();
    setCaretAtOffset(el, 999);
    // Should land somewhere valid (end), getCaretOffset returns text length.
    expect(getCaretOffset(el)).toBe(3);
  });

  it("decorateInPlace preserves caret across re-decoration", () => {
    const el = mkHost();
    decorateInPlace(el, "say **hi** there");
    el.focus();
    setCaretAtOffset(el, 9);
    decorateInPlace(el, "say **hi** there");
    expect(getCaretOffset(el)).toBe(9);
  });
});

describe("decorateLineToFragment (pure)", () => {
  it("empty line yields empty fragment", () => {
    const f = decorateLineToFragment("");
    expect(f.childNodes.length).toBe(0);
  });

  it("plain line yields one text node", () => {
    const f = decorateLineToFragment("hello");
    expect(f.childNodes.length).toBe(1);
    expect(f.firstChild?.nodeType).toBe(Node.TEXT_NODE);
  });
});
