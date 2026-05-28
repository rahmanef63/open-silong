import { describe, expect, it } from "vitest";
import * as Engine from "./index";

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
