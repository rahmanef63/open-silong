import type { ExprNode, FormulaError, FormulaValue } from "../types";

/** Common shape for every fn handler. Throws FormulaError on bad args. */
export type FnHandler = (
  node: { fn: string; args: ExprNode[]; pos: number },
  args: FormulaValue[],
) => FormulaValue;

export type FnRegistry = Record<string, FnHandler>;

/** Surface metadata — drives editor autocomplete, function picker, signature
 *  hints. Lives next to each domain's handlers so a new fn lands sigs +
 *  impl in one diff. Display-only; runtime never reads this. */
export type FnGroup = "string" | "number" | "date" | "list" | "logic";
export type FnReturns =
  | "string" | "number" | "boolean" | "date" | "list" | "any";

export interface FnSignature {
  /** Human-readable parameter names. Use `...name` prefix for the last arg
   *  to signal variadic. Optional args end with `?` (e.g. `end?`). */
  args: string[];
  returns: FnReturns;
  group: FnGroup;
  /** One-line tooltip. Skip the trailing period — picker UI appends. */
  desc: string;
}

export type FnSignatureMap = Record<string, FnSignature>;

/** Arity guard. Throws with name + pos baked in. */
export function need(
  node: { fn: string; pos: number },
  args: FormulaValue[],
  n: number,
): void {
  if (args.length < n) {
    throw { message: `'${node.fn}' needs ${n} argument(s)`, pos: node.pos } as FormulaError;
  }
}
