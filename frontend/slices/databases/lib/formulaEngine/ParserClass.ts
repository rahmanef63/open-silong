import type { ExprNode, FormulaError } from "./types";
import { parseOr, parsePrimaryBase } from "./ParserClass-ops";

/** Recursive-descent parser. The precedence ladder + primary dispatch
 *  live in ParserClass-ops.ts as free functions (kept here would push
 *  this file past the 200-LOC cap); this class owns the cursor
 *  primitives + leaf/literal parsers they call back into. */
export class Parser {
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

  /** Entry point — delegates to the precedence ladder. */
  parseExpr(): ExprNode {
    return parseOr(this);
  }

  parsePrimary(): ExprNode {
    let node = parsePrimaryBase(this);
    // Postfix `.ident` chain — left-associative. Only consume `.` when the
    // NEXT char is an ident start, so number literals like `.5` aren't
    // accidentally treated as member access. Member access works on any
    // primary (ref / call / paren expr / even literal), but only resolves
    // to a real value when the target is a page entity (or list of pages).
    while (true) {
      this.skipWS();
      if (this.peek() !== "." || !/[A-Za-z_]/.test(this.src[this.pos + 1] ?? "")) break;
      const dotPos = this.pos;
      this.advance(); // consume `.`
      const member = this.parseIdent();
      if (!member) throw this.err("Expected identifier after '.'", dotPos);
      node = { kind: "member", object: node, member, pos: dotPos };
    }
    return node;
  }

  /** Lookahead: is the next chunk `(ident, …) => …`? Returns the params on
   *  match (leaving pos at `=>` — caller consumes); restores pos on miss.
   *  Accepts empty params `() => body` (rare but unambiguous). */
  tryParseLambdaParams(): string[] | null {
    const save = this.pos;
    this.advance(); // (
    this.skipWS();
    const params: string[] = [];
    if (this.peek() !== ")") {
      if (!/[A-Za-z_]/.test(this.peek())) {
        this.pos = save;
        return null;
      }
      params.push(this.parseIdent());
      this.skipWS();
      while (this.peek() === ",") {
        this.advance();
        this.skipWS();
        if (!/[A-Za-z_]/.test(this.peek())) {
          this.pos = save;
          return null;
        }
        params.push(this.parseIdent());
        this.skipWS();
      }
    }
    if (this.peek() !== ")") {
      this.pos = save;
      return null;
    }
    this.advance(); // )
    this.skipWS();
    if (!this.src.startsWith("=>", this.pos)) {
      this.pos = save;
      return null;
    }
    return params;
  }

  /** Parse `prop("string-literal")` → ref node. Only a string literal is
   *  accepted (no expressions / no idents) — keeps the form unambiguous
   *  and matches Notion's behaviour. */
  parsePropCall(pos: number): ExprNode {
    this.expect("(");
    this.skipWS();
    const ch = this.peek();
    if (ch !== '"' && ch !== "'") {
      throw this.err(`prop() requires a string literal property name`, this.pos);
    }
    const strNode = this.parseString();
    this.skipWS();
    this.expect(")");
    // strNode is always { kind: "str", value, pos }; narrow + repackage.
    const name = (strNode as { kind: "str"; value: string }).value;
    return { kind: "ref", name, pos };
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
