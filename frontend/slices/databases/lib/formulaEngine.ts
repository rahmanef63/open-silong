/* Formula engine — split into submodules under ./formulaEngine/.
 * This barrel preserves the public API ({evalFormula, formatFormulaValue,
 * parseFormula, collectDeps, FormulaError, FormulaValue, …}). */

export type {
  FormulaValue, Node, ExprNode, TemplatePart, BinOp, FormulaError,
} from "./formulaEngine/types";
export {
  NULL_VALUE, str, num, bool, date, list,
} from "./formulaEngine/types";

export {
  toString, toNumber, toBoolean, toDate, isEmpty, formatFormulaValue,
} from "./formulaEngine/coerce";

export { parseFormula } from "./formulaEngine/parser";
export { evalFormula, type EvalContext, type EvalResult } from "./formulaEngine/evaluator";
export { collectDeps } from "./formulaEngine/deps";
