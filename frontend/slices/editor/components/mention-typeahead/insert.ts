import { liveTriggerRange } from "./dom";

export interface State {
  ce: HTMLElement;
  /** Range covering the `@query` substring — used to replace on insert. */
  range: Range;
  query: string;
  pos: { x: number; y: number };
}

export interface MentionItem {
  id: string;
  title: string;
  icon?: string;
  /** page → `/dashboard/p/<id>`, db → `/dashboard/db/<id>` */
  kind: "page" | "db";
}

export function insertMention(state: State, item: MentionItem) {
  const label = item.title || "Untitled";
  const seg = item.kind === "db" ? "db" : "p";
  const text = `[${label}](/dashboard/${seg}/${item.id}) `;
  // Re-derive the `@query` span from the live caret (marker `@` = 1 char); the
  // captured `state.range` may point at decorator-swapped, detached nodes.
  const range = liveTriggerRange(state.ce, state.query.length + 1) ?? state.range;
  const node = document.createTextNode(text);
  range.deleteContents();
  range.insertNode(node);
  const sel = window.getSelection();
  if (sel) {
    sel.removeAllRanges();
    // Caret right after the inserted mention (correct even mid-paragraph,
    // unlike `ce.lastChild` which jumps to the block end).
    const r = document.createRange();
    r.setStartAfter(node);
    r.collapse(true);
    sel.addRange(r);
  }
  state.ce.dispatchEvent(new InputEvent("input", { bubbles: true, cancelable: true, inputType: "insertText" }));
}
