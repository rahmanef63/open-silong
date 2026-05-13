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
