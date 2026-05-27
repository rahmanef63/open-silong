import type { BinOp, ExprNode, FormulaError } from "./types";

/** Reserved bare-ident refs — usable anywhere in expression position
 *  without `(`. Resolve via the eval-time env stack (set by higher-order
 *  fns like map/filter); outside a lambda context they fall through to
 *  property lookup (case-insensitive) and ultimately NULL. */
const LAMBDA_BUILTINS = new Set(["current", "index", "accumulator"]);

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

  /** Entry point. Precedence ladder (lowest → highest):
   *    parseExpr → parseOr → parseAnd → parseEquality → parseComparison
   *      → parseAddSub → parseMulDiv → parseUnary → parsePrimary
   *  Each layer only recurses into the next tighter layer, then loops
   *  consuming same-precedence operators left-associatively. `&&` / `||`
   *  short-circuit at EVAL time (evaluator.ts), not here. */
  parseExpr(): ExprNode {
    return this.parseOr();
  }

  parseOr(): ExprNode {
    let left = this.parseAnd();
    while (true) {
      this.skipWS();
      if (this.src.startsWith("||", this.pos)) {
        const pos = this.pos;
        this.pos += 2;
        const right = this.parseAnd();
        left = { kind: "binop", op: "||", left, right, pos };
      } else break;
    }
    return left;
  }

  parseAnd(): ExprNode {
    let left = this.parseEquality();
    while (true) {
      this.skipWS();
      if (this.src.startsWith("&&", this.pos)) {
        const pos = this.pos;
        this.pos += 2;
        const right = this.parseEquality();
        left = { kind: "binop", op: "&&", left, right, pos };
      } else break;
    }
    return left;
  }

  parseEquality(): ExprNode {
    let left = this.parseComparison();
    while (true) {
      this.skipWS();
      let op: "==" | "!=" | null = null;
      if (this.src.startsWith("==", this.pos)) op = "==";
      else if (this.src.startsWith("!=", this.pos)) op = "!=";
      if (!op) break;
      const pos = this.pos;
      this.pos += 2;
      const right = this.parseComparison();
      left = { kind: "binop", op, left, right, pos };
    }
    return left;
  }

  parseComparison(): ExprNode {
    let left = this.parseAddSub();
    while (true) {
      this.skipWS();
      // Check 2-char ops first to avoid `>=` parsing as `>` then `=`.
      let op: ">=" | "<=" | ">" | "<" | null = null;
      let advance = 1;
      if (this.src.startsWith(">=", this.pos)) { op = ">="; advance = 2; }
      else if (this.src.startsWith("<=", this.pos)) { op = "<="; advance = 2; }
      else if (this.peek() === ">") op = ">";
      else if (this.peek() === "<") op = "<";
      if (!op) break;
      const pos = this.pos;
      this.pos += advance;
      const right = this.parseAddSub();
      left = { kind: "binop", op, left, right, pos };
    }
    return left;
  }

  parseAddSub(): ExprNode {
    let left = this.parseMulDiv();
    while (true) {
      this.skipWS();
      const ch = this.peek();
      if (ch === "+" || ch === "-") {
        const pos = this.pos;
        this.advance();
        const right = this.parseMulDiv();
        left = { kind: "binop", op: ch as BinOp, left, right, pos };
      } else break;
    }
    return left;
  }

  parseMulDiv(): ExprNode {
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
    // `!` is unary-not — but ONLY when NOT the start of `!=`. The
    // equality-op `!=` is matched higher up in parseEquality; if we see
    // `!=` here we leave it alone (returning the primary to the parent
    // loop, which will then see `!=` as the next op).
    if (ch === "!" && this.src[this.pos + 1] !== "=") {
      const pos = this.pos;
      this.advance();
      const arg = this.parseUnary();
      return { kind: "unary", op: "!", arg, pos };
    }
    return this.parsePrimary();
  }

  parsePrimary(): ExprNode {
    let node = this.parsePrimaryBase();
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

  parsePrimaryBase(): ExprNode {
    this.skipWS();
    const pos = this.pos;
    if (this.atEnd()) throw this.err("Unexpected end of expression", pos);
    const ch = this.peek();

    if (ch === "(") {
      // Could be either:
      //   (a) `(ident, …) => body`  — lambda
      //   (b) `(expr)`                — paren group
      // Try (a) via a non-consuming lookahead; only commit if we find `=>`.
      const lambdaParams = this.tryParseLambdaParams();
      if (lambdaParams) {
        // tryParseLambdaParams left pos at `=>`; consume it now.
        this.pos += 2;
        const body = this.parseExpr();
        return { kind: "lambda", params: lambdaParams, body, pos };
      }
      this.advance(); // consume `(`
      const expr = this.parseExpr();
      this.expect(")");
      return expr;
    }
    if (ch === '"' || ch === "'") return this.parseString();
    if (this.src.startsWith("{{", this.pos)) return this.parsePropRef();
    if (/[0-9.]/.test(ch)) return this.parseNumber();

    if (/[a-zA-Z_]/.test(ch)) {
      const ident = this.parseIdent();
      // Boolean literals — recognised case-insensitively to match the
      // function-name lowering applied in parseCallTail.
      const lc = ident.toLowerCase();
      if (lc === "true") return { kind: "bool", value: true, pos };
      if (lc === "false") return { kind: "bool", value: false, pos };
      this.skipWS();
      // Bare arrow shorthand: `name => body`. Checked BEFORE the fn-call
      // dispatch so `current => current + 1` doesn't try to enter
      // parseCallTail with name "current".
      if (this.src.startsWith("=>", this.pos)) {
        this.pos += 2;
        const body = this.parseExpr();
        return { kind: "lambda", params: [ident], body, pos };
      }
      if (this.peek() === "(") {
        // Notion-style `prop("name")` — special-case BEFORE generic call
        // dispatch so the result lands as a ref node (not a call), which
        // means it shares `collectDeps` + dependency invalidation +
        // member-access chaining with the `{{name}}` template form.
        // Strict: a bare ident `prop` without `(` is still just a "fn name
        // missing its `(`" error from the existing branch — no implicit
        // variable resolution.
        if (lc === "prop") return this.parsePropCall(pos);
        return this.parseCallTail(ident, pos);
      }
      // Reserved bare-ident lambda variables — parse as ref nodes so the
      // env-stack resolver can bind them at iteration time.
      if (LAMBDA_BUILTINS.has(lc)) return { kind: "ref", name: ident, pos };
      throw this.err(`Expected '(' after function name '${ident}'`, this.pos);
    }
    throw this.err(`Unexpected character '${ch}'`, pos);
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
