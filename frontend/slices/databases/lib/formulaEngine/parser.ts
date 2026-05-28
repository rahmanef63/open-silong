import type { ExprNode, FormulaError, Node, TemplatePart } from "./types";
import { Parser } from "./ParserClass";

function shiftPositions(node: ExprNode, offset: number): ExprNode {
  const shift = (n: ExprNode): ExprNode => {
    if (n.kind === "call") return { ...n, pos: n.pos + offset, args: n.args.map(shift) };
    if (n.kind === "binop") return { ...n, pos: n.pos + offset, left: shift(n.left), right: shift(n.right) };
    if (n.kind === "unary") return { ...n, pos: n.pos + offset, arg: shift(n.arg) };
    // member + lambda carry child nodes too — recurse so error positions
    // inside `prop("X").Y` / `map(L, body)` stay aligned in `=`-form.
    if (n.kind === "member") return { ...n, pos: n.pos + offset, object: shift(n.object) };
    if (n.kind === "lambda") return { ...n, pos: n.pos + offset, body: shift(n.body) };
    return { ...n, pos: n.pos + offset };
  };
  return shift(node);
}

function parseTemplate(src: string): Node {
  const parts: TemplatePart[] = [];
  let i = 0;
  let buf = "";
  while (i < src.length) {
    if (src.startsWith("{{", i)) {
      if (buf) { parts.push({ kind: "text", value: buf }); buf = ""; }
      const end = src.indexOf("}}", i + 2);
      if (end === -1) {
        buf += src.slice(i);
        break;
      }
      const name = src.slice(i + 2, end).trim();
      parts.push({ kind: "ref", name, pos: i });
      i = end + 2;
    } else {
      buf += src[i];
      i++;
    }
  }
  if (buf) parts.push({ kind: "text", value: buf });
  return { kind: "tmpl", parts };
}

export function parseFormula(
  src: string,
): { ast: Node; error?: FormulaError } | { ast: null; error: FormulaError } {
  const trimmed = src.trim();
  if (!trimmed) return { ast: { kind: "tmpl", parts: [{ kind: "text", value: "" }] } };

  if (trimmed.startsWith("=")) {
    const offset = src.indexOf("=") + 1;
    const inner = src.slice(offset);
    const p = new Parser(inner);
    try {
      const expr = p.parseExpr();
      p.skipWS();
      if (!p.atEnd()) {
        return { ast: null, error: { message: "Unexpected trailing tokens", pos: offset + p.pos } };
      }
      return { ast: { kind: "math", expr: shiftPositions(expr, offset) } };
    } catch (e) {
      const err = e as FormulaError;
      return { ast: null, error: { ...err, pos: offset + err.pos } };
    }
  }

  const callMatch = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/);
  if (callMatch) {
    const startInSrc = src.indexOf(trimmed[0]);
    const p = new Parser(src.slice(startInSrc));
    try {
      const node = p.parsePrimary();
      p.skipWS();
      if (!p.atEnd()) {
        return { ast: null, error: { message: "Unexpected trailing tokens", pos: startInSrc + p.pos } };
      }
      return { ast: { kind: "expr", expr: shiftPositions(node, startInSrc) } };
    } catch (e) {
      const err = e as FormulaError;
      return { ast: null, error: { ...err, pos: startInSrc + err.pos } };
    }
  }

  return { ast: parseTemplate(src) };
}
