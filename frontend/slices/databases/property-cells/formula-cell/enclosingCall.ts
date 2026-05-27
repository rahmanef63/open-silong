/** Find the enclosing function call at `caret`. Returns null when caret
 *  is at top level or inside a bare-paren group (not preceded by an
 *  ident). Pure — testable without DOM.
 *
 *  Algorithm: scan forward from 0 → caret, maintain a stack of
 *  `(fnName, argIndex)` frames pushed on `(` and popped on `)`. Commas
 *  at the top of the stack bump argIndex. String literals (single + double
 *  quoted, with `\` escape) are skipped so commas/parens inside strings
 *  don't disturb the stack.  Returns the topmost frame with a non-empty
 *  fn name. */

export interface EnclosingCall {
  fnName: string;
  argIndex: number;
  /** Position of the `(` that opens this call. */
  openPos: number;
}

export function findEnclosingCall(text: string, caret: number): EnclosingCall | null {
  type Frame = { fnName: string; argIndex: number; openPos: number };
  const stack: Frame[] = [];
  let inDouble = false;
  let inSingle = false;
  const end = Math.min(caret, text.length);

  for (let i = 0; i < end; i++) {
    const ch = text[i];

    // String escape — skip next char regardless of mode.
    if (ch === "\\" && (inDouble || inSingle)) {
      i++;
      continue;
    }
    if (inDouble) {
      if (ch === '"') inDouble = false;
      continue;
    }
    if (inSingle) {
      if (ch === "'") inSingle = false;
      continue;
    }
    if (ch === '"') { inDouble = true; continue; }
    if (ch === "'") { inSingle = true; continue; }

    if (ch === "(") {
      // Capture preceding ident as fn name (empty for bare paren groups).
      let j = i - 1;
      while (j >= 0 && /[A-Za-z0-9_]/.test(text[j])) j--;
      const name = text.slice(j + 1, i);
      stack.push({ fnName: name, argIndex: 0, openPos: i });
    } else if (ch === ")") {
      stack.pop();
    } else if (ch === "," && stack.length > 0) {
      stack[stack.length - 1].argIndex++;
    }
  }

  // Topmost frame with a non-empty fn name (skip bare paren groups).
  for (let i = stack.length - 1; i >= 0; i--) {
    if (stack[i].fnName) return stack[i];
  }
  return null;
}
