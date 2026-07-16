import { describe, it, expect, afterEach } from "vitest";
import { decorateInPlace } from "../../lib/inlineDecorator";
import { walkBack } from "./dom";

afterEach(() => { document.body.innerHTML = ""; });

function mkHost(source: string): HTMLElement {
  const host = document.createElement("div");
  host.contentEditable = "true";
  document.body.appendChild(host);
  decorateInPlace(host, source);
  return host;
}

function deepestLastLeaf(root: Node): Node {
  let n: Node = root;
  while (n.lastChild) n = n.lastChild;
  return n;
}

describe("walkBack chip boundary (anti-corruption)", () => {
  it("never returns a start position inside a mention chip", () => {
    const host = mkHost("[Page One](/dashboard/p/id0001) x");
    const leaf = deepestLastLeaf(host);
    // walk back further than the caret's text node — must cross the chip
    const res = walkBack(host, leaf, (leaf.textContent ?? "").length, 999);
    expect(res).not.toBeNull();
    const chip = host.querySelector(".mention-chip")!;
    expect(chip.contains(res!.node)).toBe(false);
  });

  it("clamps to immediately after the chip when the walk overshoots", () => {
    const host = mkHost("[A](/dashboard/p/id0001) @foo");
    const leaf = deepestLastLeaf(host); // "@foo" text node (or " @foo")
    const res = walkBack(host, leaf, (leaf.textContent ?? "").length, 999)!;
    // start must be at or after the chip in document order (never inside it)
    const chip = host.querySelector(".mention-chip")!;
    expect(chip.contains(res.node)).toBe(false);
    // and the range from res→leaf-end must not include the chip's text
    const r = document.createRange();
    r.setStart(res.node, res.offset);
    r.setEndAfter(leaf);
    expect(r.toString().includes("id0001")).toBe(false);
  });
});
