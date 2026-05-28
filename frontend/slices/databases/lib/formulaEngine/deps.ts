import type { ExprNode, Node } from "./types";

/** Lambda-bound identifiers are NOT property dependencies — they resolve
 *  from the iteration env, not the row, so they must not trigger
 *  invalidation. */
const LAMBDA_VARS = new Set(["current", "index", "accumulator"]);

/** Collect the property names a formula depends on (for editor
 *  re-eval/invalidation). Walks the full AST including `member` access
 *  objects (`prop("Owner").Status` depends on Owner) and `lambda` bodies
 *  (`map(prop("Tags"), prop("Other"))` depends on both) — both added in
 *  1.C/1.D and previously missed, which silently dropped those deps. */
export function collectDeps(node: Node): Set<string> {
  const out = new Set<string>();
  const walk = (n: ExprNode) => {
    switch (n.kind) {
      case "ref":
        if (!LAMBDA_VARS.has(n.name.toLowerCase())) out.add(n.name);
        break;
      case "call": n.args.forEach(walk); break;
      case "binop": walk(n.left); walk(n.right); break;
      case "unary": walk(n.arg); break;
      case "member": walk(n.object); break;
      case "lambda": walk(n.body); break;
      // num / str / bool — leaf literals, no deps
    }
  };
  if (node.kind === "tmpl") {
    for (const p of node.parts) if (p.kind === "ref") out.add(p.name);
  } else if (node.kind === "math" || node.kind === "expr") {
    walk(node.expr);
  }
  return out;
}
