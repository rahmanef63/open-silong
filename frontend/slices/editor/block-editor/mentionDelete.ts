/** Inline mentions are stored as `[label](/dashboard/p/<id>)` (or `/db/`)
 *  in the block source; the decorator renders them as a chip but every
 *  source char stays in the DOM. Backspacing therefore nibbles one hidden
 *  bracket at a time, leaving `[Foo](/dashboard/p/ab` fragments visible.
 *
 *  This returns the `[start, end]` source range to delete when the caret
 *  sits immediately after a complete mention, so the whole chip is removed
 *  in one Backspace. Returns null otherwise (normal backspace). */
const MENTION_END_RE = /\[[^\][]+\]\(\/(?:dashboard\/)?(?:p|db)\/[A-Za-z0-9_-]+\)$/;

export function mentionDeleteRange(text: string, caret: number): [number, number] | null {
  if (caret <= 0 || caret > text.length) return null;
  if (text[caret - 1] !== ")") return null;
  const m = text.slice(0, caret).match(MENTION_END_RE);
  return m ? [caret - m[0].length, caret] : null;
}
