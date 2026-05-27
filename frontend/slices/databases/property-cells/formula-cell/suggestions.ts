import type { Database } from "@/shared/types/domain";
import {
  SIGNATURES, listFunctionNames,
} from "../../lib/formulaEngine/functions";
import { HIGHER_ORDER_NAMES } from "../../lib/formulaEngine/functions/higherOrder";
import { propNeedsClose, type Token } from "./tokenize";
import { findEnclosingCall } from "./enclosingCall";

/** Suggestion entry the editor dropdown renders. `insert` is the literal
 *  text that replaces `[token.start .. caret]`; `caretOffset` positions
 *  the caret inside the insert (e.g. -1 lands between `fn(` and `)`). */
export interface Suggestion {
  label: string;
  insert: string;
  caretOffset?: number;
  /** Secondary line — fn signature, prop type, lambda-var hint, etc. */
  detail?: string;
}

/** Build the suggestion list for the current token. Pure — split out for
 *  testability + memo stability. Suggestions sort:
 *    1. (when inside higher-order body) lambda builtin refs first
 *    2. function-name matches (sig in detail line)
 *    3. (when token.kind === "prop") db property names */
export function buildSuggestions(
  token: Token,
  value: string,
  caret: number,
  db: Database,
): Suggestion[] {
  if (token.kind === "prop") {
    const lc = token.prefix.toLowerCase();
    const includeClose = propNeedsClose(value, caret);
    const out: Suggestion[] = [];
    if ("title".startsWith(lc)) {
      out.push({ label: "title", insert: `title${includeClose ? "}}" : ""}`, detail: "row title" });
    }
    for (const p of db.properties) {
      if (!p.name.toLowerCase().startsWith(lc)) continue;
      out.push({
        label: p.name,
        insert: `${p.name}${includeClose ? "}}" : ""}`,
        detail: p.type,
      });
    }
    return out;
  }

  if (token.kind === "fn") {
    const lc = token.prefix.toLowerCase();
    const out: Suggestion[] = [];
    // When caret is inside a higher-order fn body, lambda-builtin idents
    // (current / index / accumulator) are first-class refs at this scope.
    // Surface them BEFORE fn names so the most-likely completion ranks top.
    const enclosing = findEnclosingCall(value, caret);
    if (enclosing && HIGHER_ORDER_NAMES.has(enclosing.fnName.toLowerCase())) {
      const lambdaVars = ["current", "index"];
      if (enclosing.fnName.toLowerCase() === "reduce") lambdaVars.push("accumulator");
      for (const name of lambdaVars) {
        if (name.startsWith(lc)) {
          out.push({
            label: name,
            insert: name,
            detail: `lambda var · ${enclosing.fnName}()`,
          });
        }
      }
    }
    const names = listFunctionNames();
    for (const name of names.filter((n) => n.toLowerCase().startsWith(lc))) {
      const sig = SIGNATURES[name];
      // Insert `fnName()` with caret BETWEEN the parens (offset -1 from end).
      // prop() inserts `prop("")` with caret BETWEEN the quotes since its
      // arg is always a string literal (matches picker special-case).
      const isProp = name === "prop";
      out.push({
        label: name,
        insert: isProp ? `${name}("")` : `${name}()`,
        caretOffset: isProp ? -2 : -1,
        detail: sig ? `(${sig.args.join(", ")}) → ${sig.returns}` : undefined,
      });
    }
    return out;
  }

  return [];
}
