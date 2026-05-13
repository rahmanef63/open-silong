export function closestContentEditable(node: Node | null): HTMLElement | null {
  let cur: Node | null = node;
  while (cur) {
    if (cur instanceof HTMLElement && cur.isContentEditable) return cur;
    cur = cur.parentNode;
  }
  return null;
}

export function replaceRange(range: Range, text: string, host: HTMLElement) {
  range.deleteContents();
  range.insertNode(document.createTextNode(text));
  // Collapse caret to end of inserted text so the user can keep typing.
  const sel = window.getSelection();
  if (sel) {
    sel.removeAllRanges();
    const r = document.createRange();
    r.setStartAfter(host.lastChild ?? host);
    r.collapse(true);
    sel.addRange(r);
  }
  // Trigger React's onInput so the editor saves.
  host.dispatchEvent(new InputEvent("input", { bubbles: true, cancelable: true, inputType: "insertText" }));
}
