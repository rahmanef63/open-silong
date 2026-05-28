import type { ExprNode, Node } from "./types";
import type { FnReturns } from "./functions/_registry";
import { getSignature } from "./functions";

/** Static return-type inference. Pure structural analysis over the parsed
 *  AST — no eval, no host, no schema. Powers the editor's return-type pill
 *  (1.E). Inference rules:
 *
 *    - literals       → their kind
 *    - template mode  → "string" (interpolation always stringifies)
 *    - arithmetic     → "number"
 *    - comparison /
 *      equality /
 *      logical /
 *      unary !        → "boolean"
 *    - unary +/-      → "number"
 *    - fn call        → the fn's declared SIGNATURES[fn].returns
 *    - if/ifs/switch  → common type of the value branches, else "any"
 *    - ref / member /
 *      lambda         → "any" (needs schema/runtime — not statically known)
 *
 *  Conservative: anything it can't pin down resolves to "any" rather than
 *  guessing wrong. Never throws. */
export function inferType(node: Node | null): FnReturns {
  if (!node) return "any";
  if (node.kind === "tmpl") return "string";
  return inferExpr(node.expr);
}

const ARITHMETIC = new Set(["+", "-", "*", "/", "%"]);

function inferExpr(node: ExprNode): FnReturns {
  switch (node.kind) {
    case "num": return "number";
    case "str": return "string";
    case "bool": return "boolean";
    case "ref": return "any";
    case "member": return "any";
    case "lambda": return "any";
    case "unary": return node.op === "!" ? "boolean" : "number";
    case "binop": return ARITHMETIC.has(node.op) ? "number" : "boolean";
    case "call": {
      const fn = node.fn.toLowerCase();
      // Branch-aware: conditionals return the type of their value branches
      // when those agree; otherwise "any".
      if (fn === "if") return commonType(node.args.slice(1)); // then, else?
      if (fn === "ifs") return commonType(collectIfsValues(node.args));
      if (fn === "switch") return commonType(collectSwitchValues(node.args));
      const sig = getSignature(node.fn);
      return sig?.returns ?? "any";
    }
  }
}

/** ifs(cond1, val1, cond2, val2, …, default?) — value branches at odd
 *  indices, plus a trailing default when the arg count is odd. */
function collectIfsValues(args: ExprNode[]): ExprNode[] {
  const vals: ExprNode[] = [];
  for (let i = 1; i < args.length; i += 2) vals.push(args[i]);
  if (args.length % 2 === 1) vals.push(args[args.length - 1]); // default
  return vals;
}

/** switch(value, case1, r1, case2, r2, …, default?) — result branches at
 *  even indices ≥ 2, plus a trailing default when arg count is even. */
function collectSwitchValues(args: ExprNode[]): ExprNode[] {
  const vals: ExprNode[] = [];
  for (let i = 2; i < args.length; i += 2) vals.push(args[i]);
  if (args.length % 2 === 0) vals.push(args[args.length - 1]); // default
  return vals;
}

function commonType(nodes: ExprNode[]): FnReturns {
  if (nodes.length === 0) return "any";
  const types = nodes.map(inferExpr);
  const first = types[0];
  return types.every((t) => t === first) ? first : "any";
}
