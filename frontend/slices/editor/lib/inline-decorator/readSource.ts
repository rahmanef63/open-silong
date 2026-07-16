/** Read a contentEditable block's source text out of the DOM, stripping the
 *  trailing "\n" Chromium fabricates when the block ENDS in an atomic mention
 *  chip.
 *
 *  A mention chip is rendered `contenteditable="false"` (see `decorate.ts`) so
 *  the browser refuses to place the caret inside it — or, when the chip is the
 *  last thing in the block, after it. Chromium works around that by appending a
 *  filler `<br>` after the chip to give the caret a landing spot. `el.innerText`
 *  then reports a trailing newline (per `caret.ts`, a `<br>` counts as one
 *  `\n`). If that newline is read into `source` and persisted via
 *  `updateBlock({ text })`, the next `decorateInPlace` pass splits it into an
 *  extra empty line — a visible blank line under the mention that then compounds
 *  on every keystroke.
 *
 *  We only strip when the DOM shows the exact filler signature: the last child
 *  is a `<br>` whose immediately-preceding sibling is a `contenteditable="false"`
 *  element. Intentional soft breaks (shift+enter) end in a `<br>` preceded by a
 *  text node or by another `<br>`, so they are never collapsed. */
export function stripTrailingChipFillerBr(el: HTMLElement, text: string): string {
  if (!text.endsWith("\n")) return text;
  const last = el.lastChild;
  if (!last || last.nodeName !== "BR") return text;
  const prev = last.previousSibling;
  if (
    prev &&
    prev.nodeType === 1 &&
    (prev as HTMLElement).getAttribute("contenteditable") === "false"
  ) {
    return text.slice(0, -1);
  }
  return text;
}

/** Read `el.innerText` and strip the Chromium filler-`<br>` artifact a trailing
 *  mention chip provokes (see `stripTrailingChipFillerBr`). Use this instead of
 *  raw `el.innerText` anywhere the value becomes persisted block source. */
export function readEditableSource(el: HTMLElement): string {
  return stripTrailingChipFillerBr(el, el.innerText);
}
