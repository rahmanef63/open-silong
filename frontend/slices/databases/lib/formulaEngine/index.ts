/** Pure-engine public barrel — exports EVERYTHING needed to use the
 *  formula engine from a consumer-side host adapter. Contains NO domain
 *  types from `@/shared` — the grep gate enforces this so we can lift
 *  this directory into a standalone `rahman-shared` package (1.G.2)
 *  without losing portability.
 *
 *  Consumers (Silong: `lib/formula.ts`; future Convex adapter; tests):
 *    1. Implement EngineHost<TProp, TVal, TPage, TDb>
 *    2. Build an EvalContext with `host` attached
 *    3. Call `evalFormulaCore(src, ctx)`
 *
 *  No mutable singletons; everything threads through the ctx parameter. */

// Value constructors + tagged-union types
export type {
  FormulaValue, Node, ExprNode, TemplatePart, BinOp, FormulaError,
  PageEntity,
} from "./types";
export {
  NULL_VALUE, str, num, bool, date, list, page,
} from "./types";

// Coercion helpers (toString / toNumber / toBoolean / formatFormulaValue)
// — hosts often need these when building resolvePropertyValue.
export {
  toString, toNumber, toBoolean, toDate, isEmpty, formatFormulaValue,
} from "./coerce";

// Parser surface (rare for hosts; useful for editor / static-analysis)
export { parseFormula } from "./parser";

// Eval surface — the main consumer entry point
export {
  evalFormulaCore,
  type EvalContext, type EngineHost, type EvalResult,
} from "./evaluator";

// Editor introspection — fn signatures + groupings for picker/autocomplete
export {
  SIGNATURES, listFunctionNames, functionsByGroup, getSignature, canonicalFunctionName,
} from "./functions";
export type { FnSignature, FnSignatureMap, FnGroup, FnReturns } from "./functions/_registry";
export { HIGHER_ORDER_NAMES } from "./functions/higherOrder";

// Dep walker — for editor invalidation tracking
export { collectDeps } from "./deps";

// Static return-type inference — editor return-type pill (1.E)
export { inferType } from "./typeCheck";
