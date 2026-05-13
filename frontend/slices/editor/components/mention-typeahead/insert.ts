export interface State {
  ce: HTMLElement;
  /** Range covering the `@query` substring — used to replace on insert. */
  range: Range;
  query: string;
  pos: { x: number; y: number };
}

export function insertMention(state: State, page: { id: string; title: string; icon: string }) {
  const label = page.title || "Untitled";
  const text = `[${label}](/dashboard/p/${page.id}) `;
  state.range.deleteContents();
  state.range.insertNode(document.createTextNode(text));
  const sel = window.getSelection();
  if (sel) {
    sel.removeAllRanges();
    const r = document.createRange();
    r.setStartAfter(state.ce.lastChild ?? state.ce);
    r.collapse(true);
    sel.addRange(r);
  }
  state.ce.dispatchEvent(new InputEvent("input", { bubbles: true, cancelable: true, inputType: "insertText" }));
}
