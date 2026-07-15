/** Live inline-markdown decorator for contentEditable blocks.
 *
 *  We keep the Slack-model source of truth (plain text with `**bold**`,
 *  `_italic_`, `~~strike~~`, `` `code` ``, `[label](url)` markers) and
 *  layer a decoration pass on top of the contentEditable's DOM so the
 *  rendered glyphs actually look bold/italic/etc. in the editor —
 *  matching Notion-style WYSIWYG.
 *
 *  The pass is idempotent and structure-only: the visible characters
 *  (markers + content) are unchanged, so `el.innerText` after a pass
 *  returns the same source text the user typed. Markers are wrapped
 *  in dim spans so users still understand the source. */

import { getCaretOffset, setCaretAtOffset } from "./inline-decorator/caret";
import { decorateLineToFragment } from "./inline-decorator/decorate";

export { getCaretOffset, setCaretAtOffset, decorateLineToFragment };

/** Decorate the whole contentEditable. Splits by `\n`, decorates each
 *  line, joins with `<br>`. Caret is preserved at its prior text-offset.
 *  Safe to call from `onInput` — does not modify visible text.
 *
 *  `hideMarkers` collapses the marker glyphs (``**`` ``_`` etc.) to
 *  zero font-size so they keep round-tripping through innerText but
 *  visually disappear — used by headings, where the block is already
 *  bold/styled and the markers would be noise. */
export function decorateInPlace(host: HTMLElement, source: string, opts?: { hideMarkers?: boolean }): void {
  const caret = getCaretOffset(host);
  while (host.firstChild) host.removeChild(host.firstChild);

  const lines = source.split("\n");
  for (let i = 0; i < lines.length; i++) {
    host.appendChild(decorateLineToFragment(lines[i], opts));
    if (i < lines.length - 1) {
      host.appendChild(document.createElement("br"));
    }
  }
  if (caret >= 0) setCaretAtOffset(host, caret);
}
