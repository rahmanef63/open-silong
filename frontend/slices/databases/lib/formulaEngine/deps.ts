import type { ExprNode, Node } from "./types";

export function collectDeps(node: Node): Set<string> {
  const out = new Set<string>();
  const walk = (n: ExprNode) => {
    if (n.kind === "ref") out.add(n.name);
    else if (n.kind === "call") n.args.forEach(walk);
    else if (n.kind === "binop") { walk(n.left); walk(n.right); }
    else if (n.kind === "unary") walk(n.arg);
  };
  if (node.kind === "tmpl") {
    for (const p of node.parts) if (p.kind === "ref") out.add(p.name);
  } else if (node.kind === "math" || node.kind === "expr") {
    walk(node.expr);
  }
  return out;
}
