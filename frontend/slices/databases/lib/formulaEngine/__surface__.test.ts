import { describe, expect, it } from "vitest";
import * as Engine from "./index";
import type {
  BinOp,
  EngineHost,
  EvalContext,
  EvalResult,
  ExprNode,
  FnGroup,
  FnReturns,
  FnSignature,
  FnSignatureMap,
  FormulaError,
  FormulaValue,
  Node,
  PageEntity,
  TemplatePart,
} from "./index";

/** Compile-time SemVer tripwire for the TYPE surface (§1). The runtime
 *  value exports are frozen below via `Object.keys`; type exports are
 *  erased at runtime, so they need a typecheck-time guard instead. Every
 *  public type from FORMULA-ENGINE-API.md §1 is referenced here — removing
 *  or renaming one breaks `pnpm typecheck` BEFORE it ships (a §6 MAJOR
 *  break). Generics get `unknown` slots: we assert the NAME resolves, not a
 *  particular instantiation. Adding a public type? Add it here too. */
export type PublicTypeSurface = {
  FormulaValue: FormulaValue;
  Node: Node;
  ExprNode: ExprNode;
  TemplatePart: TemplatePart;
  BinOp: BinOp;
  FormulaError: FormulaError;
  PageEntity: PageEntity;
  EvalResult: EvalResult;
  EvalContext: EvalContext<unknown, unknown, unknown, unknown>;
  EngineHost: EngineHost<unknown, unknown, unknown, unknown>;
  FnSignature: FnSignature;
  FnSignatureMap: FnSignatureMap;
  FnGroup: FnGroup;
  FnReturns: FnReturns;
};

/** Public-surface tripwire (SemVer guard — FORMULA-ENGINE-API.md §1 + §6).
 *
 *  The engine ships as `rahman-shared/formulaEngine` under a SemVer
 *  commitment. This snapshot freezes the RUNTIME (value) export surface so
 *  an accidental rename or removal — a MAJOR break for downstream consumers
 *  — fails CI here BEFORE it ships. Type-only exports are erased at runtime
 *  (so they can't appear in `Object.keys`); they're governed by the doc.
 *
 *  Changing the surface ON PURPOSE? Update this list AND record the impact
 *  per §6: adding a symbol is MINOR, removing/renaming one is MAJOR. */
const PUBLIC_VALUE_EXPORTS: readonly string[] = [
  "HIGHER_ORDER_NAMES",
  "NULL_VALUE",
  "SIGNATURES",
  "bool",
  "canonicalFunctionName",
  "collectDeps",
  "date",
  "evalFormulaCore",
  "formatFormulaValue",
  "functionsByGroup",
  "getSignature",
  "inferType",
  "isEmpty",
  "list",
  "listFunctionNames",
  "num",
  "page",
  "parseFormula",
  "str",
  "toBoolean",
  "toDate",
  "toNumber",
  "toString",
].sort();

describe("formulaEngine — public surface (SemVer tripwire)", () => {
  it("runtime exports match the frozen contract", () => {
    expect(Object.keys(Engine).sort()).toEqual([...PUBLIC_VALUE_EXPORTS]);
  });

  it("every contracted export is defined", () => {
    for (const name of PUBLIC_VALUE_EXPORTS) {
      expect(Engine[name as keyof typeof Engine], name).toBeDefined();
    }
  });
});
