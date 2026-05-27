import type { FnSignatureMap } from "./_registry";

/** Parser-level pseudo-functions — not in the runtime registry. The parser
 *  intercepts these names BEFORE dispatch, converting `prop("X")` into a
 *  ref AST node so it shares dependency tracking + member-access chaining
 *  with the `{{X}}` template form. Listed here so the editor picker +
 *  autocomplete can suggest them like any other fn. */
const G = "ref" as const;
export const refSigs: FnSignatureMap = {
  prop: {
    args: ['"name"'],
    returns: "any" as const,
    group: G,
    desc: 'Property reference — alias of {{name}}; takes a string literal',
  },
};
