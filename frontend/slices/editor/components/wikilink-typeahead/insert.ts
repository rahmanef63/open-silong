export interface State {
  ce: HTMLElement;
  /** Range covering the `[[query` substring — used to replace on insert. */
  range: Range;
  query: string;
  pos: { x: number; y: number };
}

/** Replace the `[[query` range with a plain `[[Title]] ` wikilink. We keep
 *  the bare `[[Title]]` form (NOT a `/dashboard/p/<id>` link) so the edge
 *  extractor resolves it by title — same source both the client and server
 *  extractors parse. The trailing space lets typing continue naturally. */
export function insertWikiLink(state: State, page: { id: string; title: string; icon: string }) {
  const title = page.title || "Untitled";
  const text = `[[${title}]] `;
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
  // Re-run the block's input pipeline (decorate pass repaints the wikilink
  // in place and restores the caret by text-offset).
  state.ce.dispatchEvent(new InputEvent("input", { bubbles: true, cancelable: true, inputType: "insertText" }));
}
