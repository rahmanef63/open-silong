import type { ExprNode, FormulaError, FormulaValue } from "../types";
import { stringFns } from "./string";
import { numberFns } from "./number";
import { dateFns } from "./date";
import { listFns } from "./list";
import { logicFns } from "./logic";

/** Merged registry. Last spread wins on name collision — list.ts
 *  intentionally overrides string.ts for `length`/`slice`/`reverse` so
 *  list args don't fall through the string flavour. `contains` stays
 *  string-only; list inclusion uses `includes` instead. */
const REGISTRY: Record<string, (
  node: { fn: string; args: ExprNode[]; pos: number },
  args: FormulaValue[],
) => FormulaValue> = {
  ...stringFns,
  ...numberFns,
  ...dateFns,
  ...logicFns,
  ...listFns,
};

export function evalCall(
  node: { fn: string; args: ExprNode[]; pos: number },
  args: FormulaValue[],
): FormulaValue {
  const fn = REGISTRY[node.fn];
  if (!fn) {
    throw { message: `Unknown function '${node.fn}'`, pos: node.pos } as FormulaError;
  }
  return fn(node, args);
}

/** Introspection — used by editor autocomplete (Phase 1.F). */
export function listFunctionNames(): string[] {
  return Object.keys(REGISTRY).sort();
}
