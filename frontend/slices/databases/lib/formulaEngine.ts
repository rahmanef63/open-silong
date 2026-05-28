/* Formula engine — Silong-flavored barrel.
 *
 * Re-exports the PURE engine surface from `./formulaEngine/` PLUS the
 * Silong-bound `evalFormula` from `./formula.ts` so existing call sites
 * (tests, slices/databases) keep working without code changes.
 *
 * After 1.G.1 the directory `./formulaEngine/` is portable (zero domain
 * imports — enforced by the grep gate test). 1.G.2 will lift that
 * directory into the `rahman-shared` npm package; this barrel will
 * switch its imports to point at the package, and the Silong host stays
 * in this file (consumer side). */

// Pure-engine re-exports (lifted from the engine package barrel).
export type {
  FormulaValue, Node, ExprNode, TemplatePart, BinOp, FormulaError,
  PageEntity, EngineHost, EvalContext, EvalResult,
  FnSignature, FnSignatureMap, FnGroup, FnReturns,
} from "./formulaEngine/index";
export {
  NULL_VALUE, str, num, bool, date, list, page,
  toString, toNumber, toBoolean, toDate, isEmpty, formatFormulaValue,
  parseFormula, evalFormulaCore,
  SIGNATURES, listFunctionNames, functionsByGroup, getSignature, canonicalFunctionName,
  HIGHER_ORDER_NAMES, collectDeps, inferType,
} from "./formulaEngine/index";

// Silong-bound `evalFormula` — accepts partial ctx + auto-injects silongHost.
// Existing callers (tests, FormulaCell, etc.) pass `{ row, db, pages }` without
// touching the host param.
export { evalFormula, silongHost } from "./formula";
