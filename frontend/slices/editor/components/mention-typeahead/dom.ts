/** Re-derive the `[start, caret]` Range spanning the trigger marker + query
 *  from the LIVE caret, given how many chars to walk back (marker + query
 *  length). The inline decorator (`inlineDecorator.ts`) rebuilds the block's
 *  text nodes after every input, so a Range captured at trigger time points at
 *  detached nodes and its `deleteContents()` silently no-ops — leaving the
 *  typed `@query` / `[[query` behind next to the inserted link. Reading the
 *  current caret and walking the current nodes at insert time avoids that. */
export function liveTriggerRange(ce: HTMLElement, backCount: number): Range | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const caret = sel.getRangeAt(0);
  if (!caret.collapsed || !ce.contains(caret.endContainer)) return null;
  const start = walkBack(ce, caret.endContainer, caret.endOffset, backCount);
  if (!start) return null;
  const range = document.createRange();
  range.setStart(start.node, start.offset);
  range.setEnd(caret.endContainer, caret.endOffset);
  return range;
}

/** Walk backward from `(node, offset)` by `count` characters. Returns the
 *  resulting node + offset, or null if the walk falls off the front. */
export function walkBack(
  root: HTMLElement,
  node: Node,
  offset: number,
  count: number,
): { node: Node; offset: number } | null {
  let curNode: Node | null = node;
  let curOffset = offset;
  let remaining = count;
  while (curNode) {
    const len = curNode.nodeType === 3 ? (curNode.textContent ?? "").length : 0;
    if (curNode.nodeType === 3 && curOffset >= remaining) {
      return { node: curNode, offset: curOffset - remaining };
    }
    if (curNode.nodeType === 3) {
      remaining -= curOffset;
    }
    const prev = previousLeaf(curNode, root);
    if (!prev) return null;
    curNode = prev;
    curOffset = prev.nodeType === 3 ? (prev.textContent ?? "").length : 0;
    void len;
  }
  return null;
}

function previousLeaf(node: Node, root: HTMLElement): Node | null {
  if (node === root) return null;
  let cur: Node | null = node;
  while (cur && cur !== root) {
    if (cur.previousSibling) {
      let p: Node = cur.previousSibling;
      while (p.lastChild) p = p.lastChild;
      return p;
    }
    cur = cur.parentNode;
  }
  return null;
}
