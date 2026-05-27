/** Caret-position token analysis for the formula editor autocomplete.
 *
 *  Two kinds of completion live here:
 *    - "prop"  → caret is inside an unclosed `{{...` ref, complete the name
 *    - "fn"    → caret follows a bare ident not yet followed by `(`, complete to fn
 *
 *  Pure functions (no DOM) so the same logic can drive single-line input,
 *  multi-line textarea, and unit tests without environment fakery. */

export interface Token {
  kind: "prop" | "fn" | null;
  /** Index in source where the replaceable token text starts. */
  start: number;
  /** Text from `start` up to caret (the user's typed prefix). */
  prefix: string;
}

/** Resolve the token under caret. Returns kind=null when no completion
 *  applies (e.g. caret in whitespace, inside a string literal, or
 *  immediately before an already-open `(`). */
export function getTokenAt(text: string, caret: number): Token {
  const before = text.slice(0, Math.max(0, Math.min(caret, text.length)));

  // ── Inside an unclosed `{{...}}` ref?
  const lastOpen = before.lastIndexOf("{{");
  const lastClose = before.lastIndexOf("}}");
  if (lastOpen >= 0 && lastOpen > lastClose) {
    return {
      kind: "prop",
      start: lastOpen + 2,
      prefix: text.slice(lastOpen + 2, caret),
    };
  }

  // ── Bare ident position? Match a trailing `[A-Za-z_][A-Za-z0-9_]*`.
  const m = /[A-Za-z_][A-Za-z0-9_]*$/.exec(before);
  if (m && m.index !== undefined) {
    // Don't suggest a fn name when the caret already sits at `name(` — the
    // call is already begun.
    const after = text.slice(caret);
    if (after.startsWith("(")) {
      return { kind: null, start: caret, prefix: "" };
    }
    // Skip when we're inside a string literal (basic check — look for an
    // odd number of unescaped quotes before this ident on the same line).
    if (inStringLiteral(before)) {
      return { kind: null, start: caret, prefix: "" };
    }
    return { kind: "fn", start: caret - m[0].length, prefix: m[0] };
  }

  return { kind: null, start: caret, prefix: "" };
}

/** Heuristic: are we inside a string literal at the end of `text`? Counts
 *  unescaped `"` and `'` on the same line; odd → still open. */
function inStringLiteral(text: string): boolean {
  const lineStart = text.lastIndexOf("\n") + 1;
  const line = text.slice(lineStart);
  let inDouble = false;
  let inSingle = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === "\\") { i++; continue; }
    if (ch === '"' && !inSingle) inDouble = !inDouble;
    else if (ch === "'" && !inDouble) inSingle = !inSingle;
  }
  return inDouble || inSingle;
}

/** Whether the token's replacement should include a closing `}}` to balance
 *  the open delimiter when no closer exists between caret and EOL. */
export function propNeedsClose(text: string, caret: number): boolean {
  const after = text.slice(caret);
  const closeIdx = after.indexOf("}}");
  const nextOpenIdx = after.indexOf("{{");
  // If `}}` is missing OR another `{{` opens before the next `}}`, we need
  // to emit our own `}}` to close this ref.
  if (closeIdx === -1) return true;
  if (nextOpenIdx !== -1 && nextOpenIdx < closeIdx) return true;
  return false;
}
