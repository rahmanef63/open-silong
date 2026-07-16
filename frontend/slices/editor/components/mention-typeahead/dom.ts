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

/** A mention chip (or any contentEditable=false island) is an ATOMIC leaf:
 *  walkBack must never descend into its hidden `[`…`](url)`…`)` text nodes,
 *  or a mention insert's delete-range would start inside the previous chip
 *  and nest it. Treat it as an opaque boundary. */
function isAtomicChip(node: Node): node is HTMLElement {
  if (node.nodeType !== 1) return false;
  const el = node as HTMLElement;
  return el.classList?.contains("mention-chip") || el.getAttribute("contenteditable") === "false";
}

function indexOfChild(parent: Node, child: Node): number {
  let i = 0;
  let n = parent.firstChild;
  while (n && n !== child) { i++; n = n.nextSibling; }
  return i;
}

/** Walk backward from `(node, offset)` by `count` characters. Returns the
 *  resulting node + offset, or null if the walk falls off the front. If the
 *  walk reaches a mention chip, it clamps to the position immediately AFTER
 *  the chip (never inside it). */
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
    if (curNode.nodeType === 3 && curOffset >= remaining) {
      return { node: curNode, offset: curOffset - remaining };
    }
    if (curNode.nodeType === 3) {
      remaining -= curOffset;
    }
    const prev = previousLeaf(curNode, root);
    if (!prev) return null;
    if (isAtomicChip(prev)) {
      const parent = prev.parentNode;
      if (!parent) return null;
      return { node: parent, offset: indexOfChild(parent, prev) + 1 };
    }
    curNode = prev;
    curOffset = prev.nodeType === 3 ? (prev.textContent ?? "").length : 0;
  }
  return null;
}

function previousLeaf(node: Node, root: HTMLElement): Node | null {
  if (node === root) return null;
  let cur: Node | null = node;
  while (cur && cur !== root) {
    if (cur.previousSibling) {
      let p: Node = cur.previousSibling;
      if (isAtomicChip(p)) return p; // opaque: don't descend into the chip
      while (p.lastChild) {
        p = p.lastChild;
        if (isAtomicChip(p)) return p;
      }
      return p;
    }
    cur = cur.parentNode;
  }
  return null;
}
