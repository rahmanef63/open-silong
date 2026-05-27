import type { ExprNode, FormulaError, FormulaValue } from "../types";
import type { FnGroup, FnSignature } from "./_registry";
import { stringFns, stringSigs } from "./string";
import { numberFns, numberSigs } from "./number";
import { dateFns, dateSigs } from "./date";
import { listFns, listSigs } from "./list";
import { logicFns, logicSigs } from "./logic";
import { refSigs } from "./refs";

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

/** Display metadata — same merge order as REGISTRY so a fn's signature
 *  always matches its handler. Editor (1.F) reads this for autocomplete,
 *  function picker, signature hints. Runtime never touches it.
 *  `refSigs` adds parser-level pseudo-fns (prop) — present here only so
 *  the picker can suggest them; the runtime dispatcher never sees them. */
export const SIGNATURES: Record<string, FnSignature> = {
  ...stringSigs,
  ...numberSigs,
  ...dateSigs,
  ...logicSigs,
  ...listSigs,
  ...refSigs,
};

export function evalCall(
  node: { fn: string; args: ExprNode[]; pos: number },
  args: FormulaValue[],
): FormulaValue {
  // Parser lowers fn names (parseCallTail lowercases). Match registry by
  // the same lowered form; signature lookup elsewhere uses the canonical
  // (mixed-case) spelling.
  const fn = REGISTRY[node.fn] ?? REGISTRY[node.fn.toLowerCase()];
  if (!fn) {
    throw { message: `Unknown function '${node.fn}'`, pos: node.pos } as FormulaError;
  }
  return fn(node, args);
}

/** Introspection — used by editor autocomplete (Phase 1.F). Returns the
 *  display-cased names (matches SIGNATURES keys), sorted. */
export function listFunctionNames(): string[] {
  return Object.keys(SIGNATURES).sort((a, b) => a.localeCompare(b));
}

/** Group → ordered name list for the picker. */
export function functionsByGroup(): Record<FnGroup, string[]> {
  const out: Record<FnGroup, string[]> = {
    ref: [], string: [], number: [], date: [], list: [], logic: [],
  };
  for (const [name, sig] of Object.entries(SIGNATURES)) {
    out[sig.group].push(name);
  }
  for (const k of Object.keys(out) as FnGroup[]) out[k].sort((a, b) => a.localeCompare(b));
  return out;
}

/** Case-insensitive signature lookup — editor autocomplete may have
 *  whatever case the user typed; the registry is canonical mixed-case. */
export function getSignature(name: string): FnSignature | undefined {
  if (SIGNATURES[name]) return SIGNATURES[name];
  const lower = name.toLowerCase();
  for (const key of Object.keys(SIGNATURES)) {
    if (key.toLowerCase() === lower) return SIGNATURES[key];
  }
  return undefined;
}

/** Canonical (display-cased) name for a (possibly lower-cased) fn name.
 *  Used when inserting into the editor — keep idiomatic case. */
export function canonicalFunctionName(name: string): string {
  if (SIGNATURES[name]) return name;
  const lower = name.toLowerCase();
  for (const key of Object.keys(SIGNATURES)) {
    if (key.toLowerCase() === lower) return key;
  }
  return name;
}
