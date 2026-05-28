import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getCaretOffset, setCaretAtOffset } from "./caret";

let host: HTMLElement;

beforeEach(() => {
  host = document.createElement("div");
  host.contentEditable = "true";
  document.body.appendChild(host);
});
afterEach(() => {
  window.getSelection()?.removeAllRanges();
  host.remove();
});

/** Collapse the selection at a text-node offset (the unambiguous case). */
function selectInText(node: Node, offset: number) {
  const r = document.createRange();
  r.setStart(node, offset);
  r.collapse(true);
  const s = window.getSelection()!;
  s.removeAllRanges();
  s.addRange(r);
}

describe("getCaretOffset", () => {
  it("returns -1 with no selection", () => {
    window.getSelection()?.removeAllRanges();
    expect(getCaretOffset(host)).toBe(-1);
  });

  it("returns -1 when the selection is outside the host", () => {
    const other = document.createElement("div");
    other.textContent = "elsewhere";
    document.body.appendChild(other);
    selectInText(other.firstChild!, 3);
    expect(getCaretOffset(host)).toBe(-1);
    other.remove();
  });

  it("counts visible characters before a text-node caret", () => {
    host.innerHTML = "hello world";
    selectInText(host.firstChild!, 5);
    expect(getCaretOffset(host)).toBe(5);
  });

  it("counts through nested inline elements", () => {
    host.innerHTML = "ab<b>cd</b>ef"; // a b | c d | e f
    const cd = host.querySelector("b")!.firstChild!;
    selectInText(cd, 1); // after 'c' → global offset 3
    expect(getCaretOffset(host)).toBe(3);
  });

  it("counts a <br> as one character", () => {
    host.innerHTML = "a<br>b";
    selectInText(host.lastChild!, 0); // start of 'b' → after 'a' + br
    expect(getCaretOffset(host)).toBe(2);
  });
});

describe("setCaretAtOffset → getCaretOffset round-trip", () => {
  it("round-trips plain text at several offsets", () => {
    host.innerHTML = "hello world";
    for (const n of [0, 1, 5, 11]) {
      setCaretAtOffset(host, n);
      expect(getCaretOffset(host)).toBe(n);
    }
  });

  it("round-trips across nested elements", () => {
    host.innerHTML = "ab<b>cd</b>ef"; // length 6
    for (const n of [1, 3, 5, 6]) {
      setCaretAtOffset(host, n);
      expect(getCaretOffset(host)).toBe(n);
    }
  });

  it("round-trips around a <br>", () => {
    host.innerHTML = "a<br>b";
    setCaretAtOffset(host, 1); // end of 'a'
    expect(getCaretOffset(host)).toBe(1);
    setCaretAtOffset(host, 2); // start of 'b' (past the br)
    expect(getCaretOffset(host)).toBe(2);
  });

  it("clamps an over-long target to the end", () => {
    host.innerHTML = "hello"; // length 5
    setCaretAtOffset(host, 999);
    expect(getCaretOffset(host)).toBe(5);
  });

  it("Infinity jumps to the end", () => {
    host.innerHTML = "hello world";
    setCaretAtOffset(host, Infinity);
    expect(getCaretOffset(host)).toBe(11);
  });

  it("a negative target is a no-op (selection untouched)", () => {
    host.innerHTML = "hello";
    setCaretAtOffset(host, 2);
    setCaretAtOffset(host, -5); // ignored
    expect(getCaretOffset(host)).toBe(2);
  });
});
