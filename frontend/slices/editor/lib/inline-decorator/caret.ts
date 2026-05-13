/** Walk the contentEditable, count visible characters before the
 *  selection-start. `<br>` counts as one `\n`. Returns -1 if no
 *  selection or selection lives outside `host`. */
export function getCaretOffset(host: HTMLElement): number {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return -1;
  const range = sel.getRangeAt(0);
  if (!host.contains(range.startContainer)) return -1;
  let offset = 0;
  const stop = range.startContainer;
  const stopOffset = range.startOffset;
  let done = false;

  function visit(node: Node) {
    if (done) return;
    if (node === stop && (node.nodeType === Node.TEXT_NODE || node.nodeType === Node.ELEMENT_NODE)) {
      if (node.nodeType === Node.TEXT_NODE) {
        offset += stopOffset;
        done = true;
        return;
      }
      // Element-node anchor: count first `stopOffset` children fully.
      for (let i = 0; i < stopOffset && i < node.childNodes.length; i++) visit(node.childNodes[i]);
      done = true;
      return;
    }
    if (node.nodeType === Node.TEXT_NODE) {
      offset += (node.nodeValue ?? "").length;
      return;
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      if (el.tagName === "BR") {
        offset += 1; // counts as `\n`
        return;
      }
      for (let i = 0; i < node.childNodes.length; i++) {
        if (done) return;
        visit(node.childNodes[i]);
      }
    }
  }

  for (let i = 0; i < host.childNodes.length; i++) {
    if (done) break;
    visit(host.childNodes[i]);
  }
  return offset;
}

/** Place caret at character `target` in `host`. Pass `Infinity` to
 *  jump to the end. Walks text nodes left-to-right and treats `<br>`
 *  as a single `\n`. */
export function setCaretAtOffset(host: HTMLElement, target: number): void {
  if (target < 0) return;
  const sel = window.getSelection();
  if (!sel) return;
  const range = document.createRange();
  let remaining = target;
  let placed = false;

  function visit(node: Node): boolean {
    if (placed) return true;
    if (node.nodeType === Node.TEXT_NODE) {
      const len = (node.nodeValue ?? "").length;
      if (remaining <= len) {
        range.setStart(node, Math.max(0, remaining));
        range.collapse(true);
        placed = true;
        return true;
      }
      remaining -= len;
      return false;
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      if (el.tagName === "BR") {
        if (remaining <= 0) {
          const parent = el.parentNode!;
          const idx = Array.prototype.indexOf.call(parent.childNodes, el);
          range.setStart(parent, idx);
          range.collapse(true);
          placed = true;
          return true;
        }
        remaining -= 1;
        return false;
      }
      for (let i = 0; i < node.childNodes.length; i++) {
        if (visit(node.childNodes[i])) return true;
      }
    }
    return false;
  }

  for (let i = 0; i < host.childNodes.length; i++) {
    if (visit(host.childNodes[i])) break;
  }

  if (!placed) {
    range.selectNodeContents(host);
    range.collapse(false);
  }

  sel.removeAllRanges();
  sel.addRange(range);
}
