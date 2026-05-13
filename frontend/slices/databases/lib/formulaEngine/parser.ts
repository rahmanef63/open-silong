import type { BinOp, ExprNode, FormulaError, Node, TemplatePart } from "./types";

class Parser {
  pos = 0;
  constructor(public src: string) {}

  atEnd() { return this.pos >= this.src.length; }
  peek() { return this.src[this.pos]; }
  advance() { return this.src[this.pos++]; }
  skipWS() {
    while (!this.atEnd() && /\s/.test(this.peek())) this.pos++;
  }
  err(message: string, pos = this.pos): FormulaError {
    return { message, pos };
  }
  match(s: string) {
    this.skipWS();
    if (this.src.startsWith(s, this.pos)) { this.pos += s.length; return true; }
    return false;
  }
  expect(s: string) {
    if (!this.match(s)) throw this.err(`Expected '${s}'`);
  }

  parseExpr(): ExprNode {
    let left = this.parseTerm();
    while (true) {
      this.skipWS();
      const ch = this.peek();
      if (ch === "+" || ch === "-") {
        const pos = this.pos;
        this.advance();
        const right = this.parseTerm();
        left = { kind: "binop", op: ch as BinOp, left, right, pos };
      } else break;
    }
    return left;
  }

  parseTerm(): ExprNode {
    let left = this.parseUnary();
    while (true) {
      this.skipWS();
      const ch = this.peek();
      if (ch === "*" || ch === "/" || ch === "%") {
        const pos = this.pos;
        this.advance();
        const right = this.parseUnary();
        left = { kind: "binop", op: ch as BinOp, left, right, pos };
      } else break;
    }
    return left;
  }

  parseUnary(): ExprNode {
    this.skipWS();
    const ch = this.peek();
    if (ch === "-" || ch === "+") {
      const pos = this.pos;
      this.advance();
      const arg = this.parseUnary();
      return { kind: "unary", op: ch as "-" | "+", arg, pos };
    }
    return this.parsePrimary();
  }

  parsePrimary(): ExprNode {
    this.skipWS();
    const pos = this.pos;
    if (this.atEnd()) throw this.err("Unexpected end of expression", pos);
    const ch = this.peek();

    if (ch === "(") {
      this.advance();
      const expr = this.parseExpr();
      this.expect(")");
      return expr;
    }
    if (ch === '"' || ch === "'") return this.parseString();
    if (this.src.startsWith("{{", this.pos)) return this.parsePropRef();
    if (/[0-9.]/.test(ch)) return this.parseNumber();

    if (/[a-zA-Z_]/.test(ch)) {
      const ident = this.parseIdent();
      this.skipWS();
      if (this.peek() === "(") return this.parseCallTail(ident, pos);
      throw this.err(`Expected '(' after function name '${ident}'`, this.pos);
    }
    throw this.err(`Unexpected character '${ch}'`, pos);
  }

  parseString(): ExprNode {
    const pos = this.pos;
    const quote = this.advance();
    let value = "";
    while (!this.atEnd()) {
      const ch = this.advance();
      if (ch === "\\" && !this.atEnd()) {
        const esc = this.advance();
        value += esc === "n" ? "\n" : esc === "t" ? "\t" : esc;
        continue;
      }
      if (ch === quote) return { kind: "str", value, pos };
      value += ch;
    }
    throw this.err("Unterminated string literal", pos);
  }

  parseNumber(): ExprNode {
    const pos = this.pos;
    let s = "";
    while (!this.atEnd() && /[0-9.]/.test(this.peek())) s += this.advance();
    const n = Number(s);
    if (!Number.isFinite(n)) throw this.err(`Invalid number '${s}'`, pos);
    return { kind: "num", value: n, pos };
  }

  parsePropRef(): ExprNode {
    const pos = this.pos;
    if (!this.src.startsWith("{{", this.pos)) throw this.err("Expected '{{'", pos);
    this.pos += 2;
    let name = "";
    while (!this.atEnd() && !this.src.startsWith("}}", this.pos)) {
      name += this.advance();
    }
    if (!this.src.startsWith("}}", this.pos)) throw this.err("Unterminated '{{ }}' reference", pos);
    this.pos += 2;
    return { kind: "ref", name: name.trim(), pos };
  }

  parseIdent(): string {
    let s = "";
    while (!this.atEnd() && /[a-zA-Z0-9_]/.test(this.peek())) s += this.advance();
    return s;
  }

  parseCallTail(fn: string, pos: number): ExprNode {
    this.expect("(");
    const args: ExprNode[] = [];
    this.skipWS();
    if (this.peek() !== ")") {
      args.push(this.parseExpr());
      while (this.match(",")) args.push(this.parseExpr());
    }
    this.expect(")");
    return { kind: "call", fn: fn.toLowerCase(), args, pos };
  }
}

function shiftPositions(node: ExprNode, offset: number): ExprNode {
  const shift = (n: ExprNode): ExprNode => {
    if (n.kind === "call") return { ...n, pos: n.pos + offset, args: n.args.map(shift) };
    if (n.kind === "binop") return { ...n, pos: n.pos + offset, left: shift(n.left), right: shift(n.right) };
    if (n.kind === "unary") return { ...n, pos: n.pos + offset, arg: shift(n.arg) };
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

export function parseFormula(src: string): { ast: Node; error?: FormulaError } | { ast: null; error: FormulaError } {
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
