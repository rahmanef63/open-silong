import type { BinOp, ExprNode } from "./types";
import type { Parser } from "./ParserClass";

/** Reserved bare-ident refs — usable anywhere in expression position
 *  without `(`. Resolve via the eval-time env stack (set by higher-order
 *  fns like map/filter); outside a lambda context they fall through to
 *  property lookup (case-insensitive) and ultimately NULL. */
const LAMBDA_BUILTINS = new Set(["current", "index", "accumulator"]);

/** Precedence ladder (lowest → highest):
 *    parseOr → parseAnd → parseEquality → parseComparison
 *      → parseAddSub → parseMulDiv → parseUnary → p.parsePrimary
 *  Each layer only recurses into the next tighter layer, then loops
 *  consuming same-precedence operators left-associatively. `&&` / `||`
 *  short-circuit at EVAL time (evaluator.ts), not here. */
export function parseOr(p: Parser): ExprNode {
  let left = parseAnd(p);
  while (true) {
    p.skipWS();
    if (p.src.startsWith("||", p.pos)) {
      const pos = p.pos;
      p.pos += 2;
      const right = parseAnd(p);
      left = { kind: "binop", op: "||", left, right, pos };
    } else break;
  }
  return left;
}

function parseAnd(p: Parser): ExprNode {
  let left = parseEquality(p);
  while (true) {
    p.skipWS();
    if (p.src.startsWith("&&", p.pos)) {
      const pos = p.pos;
      p.pos += 2;
      const right = parseEquality(p);
      left = { kind: "binop", op: "&&", left, right, pos };
    } else break;
  }
  return left;
}

function parseEquality(p: Parser): ExprNode {
  let left = parseComparison(p);
  while (true) {
    p.skipWS();
    let op: "==" | "!=" | null = null;
    if (p.src.startsWith("==", p.pos)) op = "==";
    else if (p.src.startsWith("!=", p.pos)) op = "!=";
    if (!op) break;
    const pos = p.pos;
    p.pos += 2;
    const right = parseComparison(p);
    left = { kind: "binop", op, left, right, pos };
  }
  return left;
}

function parseComparison(p: Parser): ExprNode {
  let left = parseAddSub(p);
  while (true) {
    p.skipWS();
    // Check 2-char ops first to avoid `>=` parsing as `>` then `=`.
    let op: ">=" | "<=" | ">" | "<" | null = null;
    let advance = 1;
    if (p.src.startsWith(">=", p.pos)) { op = ">="; advance = 2; }
    else if (p.src.startsWith("<=", p.pos)) { op = "<="; advance = 2; }
    else if (p.peek() === ">") op = ">";
    else if (p.peek() === "<") op = "<";
    if (!op) break;
    const pos = p.pos;
    p.pos += advance;
    const right = parseAddSub(p);
    left = { kind: "binop", op, left, right, pos };
  }
  return left;
}

function parseAddSub(p: Parser): ExprNode {
  let left = parseMulDiv(p);
  while (true) {
    p.skipWS();
    const ch = p.peek();
    if (ch === "+" || ch === "-") {
      const pos = p.pos;
      p.advance();
      const right = parseMulDiv(p);
      left = { kind: "binop", op: ch as BinOp, left, right, pos };
    } else break;
  }
  return left;
}

function parseMulDiv(p: Parser): ExprNode {
  let left = parseUnary(p);
  while (true) {
    p.skipWS();
    const ch = p.peek();
    if (ch === "*" || ch === "/" || ch === "%") {
      const pos = p.pos;
      p.advance();
      const right = parseUnary(p);
      left = { kind: "binop", op: ch as BinOp, left, right, pos };
    } else break;
  }
  return left;
}

function parseUnary(p: Parser): ExprNode {
  p.skipWS();
  const ch = p.peek();
  if (ch === "-" || ch === "+") {
    const pos = p.pos;
    p.advance();
    const arg = parseUnary(p);
    return { kind: "unary", op: ch as "-" | "+", arg, pos };
  }
  // `!` is unary-not — but ONLY when NOT the start of `!=`. The
  // equality-op `!=` is matched higher up in parseEquality; if we see
  // `!=` here we leave it alone (returning the primary to the parent
  // loop, which will then see `!=` as the next op).
  if (ch === "!" && p.src[p.pos + 1] !== "=") {
    const pos = p.pos;
    p.advance();
    const arg = parseUnary(p);
    return { kind: "unary", op: "!", arg, pos };
  }
  return p.parsePrimary();
}

/** Primary dispatch (no postfix `.member` chain — that lives in
 *  Parser.parsePrimary which wraps this). */
export function parsePrimaryBase(p: Parser): ExprNode {
  p.skipWS();
  const pos = p.pos;
  if (p.atEnd()) throw p.err("Unexpected end of expression", pos);
  const ch = p.peek();

  if (ch === "(") {
    // Could be either:
    //   (a) `(ident, …) => body`  — lambda
    //   (b) `(expr)`                — paren group
    // Try (a) via a non-consuming lookahead; only commit if we find `=>`.
    const lambdaParams = p.tryParseLambdaParams();
    if (lambdaParams) {
      // tryParseLambdaParams left pos at `=>`; consume it now.
      p.pos += 2;
      const body = p.parseExpr();
      return { kind: "lambda", params: lambdaParams, body, pos };
    }
    p.advance(); // consume `(`
    const expr = p.parseExpr();
    p.expect(")");
    return expr;
  }
  if (ch === '"' || ch === "'") return p.parseString();
  if (p.src.startsWith("{{", p.pos)) return p.parsePropRef();
  if (/[0-9.]/.test(ch)) return p.parseNumber();

  if (/[a-zA-Z_]/.test(ch)) {
    const ident = p.parseIdent();
    // Boolean literals — recognised case-insensitively to match the
    // function-name lowering applied in parseCallTail.
    const lc = ident.toLowerCase();
    if (lc === "true") return { kind: "bool", value: true, pos };
    if (lc === "false") return { kind: "bool", value: false, pos };
    p.skipWS();
    // Bare arrow shorthand: `name => body`. Checked BEFORE the fn-call
    // dispatch so `current => current + 1` doesn't try to enter
    // parseCallTail with name "current".
    if (p.src.startsWith("=>", p.pos)) {
      p.pos += 2;
      const body = p.parseExpr();
      return { kind: "lambda", params: [ident], body, pos };
    }
    if (p.peek() === "(") {
      // Notion-style `prop("name")` — special-case BEFORE generic call
      // dispatch so the result lands as a ref node (not a call), which
      // means it shares `collectDeps` + dependency invalidation +
      // member-access chaining with the `{{name}}` template form.
      if (lc === "prop") return p.parsePropCall(pos);
      return p.parseCallTail(ident, pos);
    }
    // Reserved bare-ident lambda variables — parse as ref nodes so the
    // env-stack resolver can bind them at iteration time.
    if (LAMBDA_BUILTINS.has(lc)) return { kind: "ref", name: ident, pos };
    throw p.err(`Expected '(' after function name '${ident}'`, p.pos);
  }
  throw p.err(`Unexpected character '${ch}'`, pos);
}
