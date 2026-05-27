import type { ExprNode, FormulaError, FormulaValue } from "../types";

/** Common shape for every fn handler. Throws FormulaError on bad args. */
export type FnHandler = (
  node: { fn: string; args: ExprNode[]; pos: number },
  args: FormulaValue[],
) => FormulaValue;

export type FnRegistry = Record<string, FnHandler>;

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
