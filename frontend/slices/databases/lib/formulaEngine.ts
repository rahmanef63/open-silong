import type { Database, Page, Property, PropertyValue } from "@/shared/types/domain";

/* ============================================================
 * Typed values
 * ============================================================ */

export type FormulaValue =
  | { kind: "string"; value: string }
  | { kind: "number"; value: number }
  | { kind: "boolean"; value: boolean }
  | { kind: "date"; value: string }
  | { kind: "null" }
  | { kind: "list"; value: FormulaValue[] };

export const NULL_VALUE: FormulaValue = { kind: "null" };
export const str = (v: string): FormulaValue => ({ kind: "string", value: v });
export const num = (v: number): FormulaValue => ({ kind: "number", value: v });
export const bool = (v: boolean): FormulaValue => ({ kind: "boolean", value: v });
export const date = (v: string): FormulaValue => ({ kind: "date", value: v });
export const list = (v: FormulaValue[]): FormulaValue => ({ kind: "list", value: v });

/* ============================================================
 * AST
 * ============================================================ */

export type Node =
  | { kind: "tmpl"; parts: TemplatePart[] }
  | { kind: "math"; expr: ExprNode }
  | { kind: "expr"; expr: ExprNode };

type TemplatePart =
  | { kind: "text"; value: string }
  | { kind: "ref"; name: string; pos: number };

export type ExprNode =
  | { kind: "num"; value: number; pos: number }
  | { kind: "str"; value: string; pos: number }
  | { kind: "ref"; name: string; pos: number }
  | { kind: "call"; fn: string; args: ExprNode[]; pos: number }
  | { kind: "binop"; op: BinOp; left: ExprNode; right: ExprNode; pos: number }
  | { kind: "unary"; op: "-" | "+"; arg: ExprNode; pos: number };

type BinOp = "+" | "-" | "*" | "/" | "%";

/* ============================================================
 * Errors
 * ============================================================ */

export interface FormulaError {
  message: string;
  pos: number;
  end?: number;
}

/* ============================================================
 * Parser
 * ============================================================ */

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

  /** expr := term (("+" | "-") term)* */
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

  /** term := factor (("*" | "/" | "%") factor)* */
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

  /** unary := ("-" | "+")? primary */
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

  /** primary := NUMBER | STRING | propRef | call | "(" expr ")" */
  parsePrimary(): ExprNode {
    this.skipWS();
    const pos = this.pos;
    if (this.atEnd()) throw this.err("Unexpected end of expression", pos);
    const ch = this.peek();

    // Parenthesized
    if (ch === "(") {
      this.advance();
      const expr = this.parseExpr();
      this.expect(")");
      return expr;
    }

    // String literal
    if (ch === '"' || ch === "'") {
      return this.parseString();
    }

    // {{propRef}}
    if (this.src.startsWith("{{", this.pos)) {
      return this.parsePropRef();
    }

    // Number
    if (/[0-9.]/.test(ch)) {
      return this.parseNumber();
    }

    // Identifier → call (must be followed by `(`)
    if (/[a-zA-Z_]/.test(ch)) {
      const ident = this.parseIdent();
      this.skipWS();
      if (this.peek() === "(") {
        return this.parseCallTail(ident, pos);
      }
      // Bare identifier — treat as zero-arg call shorthand if known? No, error.
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

export function parseFormula(src: string): { ast: Node; error?: FormulaError } | { ast: null; error: FormulaError } {
  const trimmed = src.trim();
  if (!trimmed) return { ast: { kind: "tmpl", parts: [{ kind: "text", value: "" }] } };

  // Math mode: leading '='
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

  // Call mode: input shaped like IDENT(...) — commit to expression mode and
  // surface parse errors instead of silently falling through to template.
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

  // Template mode: text with {{name}} substitutions
  return { ast: parseTemplate(src) };
}

function shiftPositions(node: ExprNode, offset: number): ExprNode {
  const shift = (n: ExprNode): ExprNode => {
    const base = { ...n, pos: n.pos + offset };
    if (n.kind === "call") return { ...base, args: n.args.map(shift) };
    if (n.kind === "binop") return { ...base, left: shift(n.left), right: shift(n.right) };
    if (n.kind === "unary") return { ...base, arg: shift(n.arg) };
    return base;
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
        // no closing brace — keep as text
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

/* ============================================================
 * Evaluator
 * ============================================================ */

export interface EvalContext {
  row: Page;
  db: Database;
  pages: Page[];
  /** Visited keys "rowId:propId" — circular-dependency guard. */
  visited?: Set<string>;
  /** Memoization for repeated formulas across the same tree. */
  cache?: Map<string, FormulaValue>;
}

export interface EvalResult {
  value: FormulaValue;
  error?: FormulaError;
}

export function evalFormula(src: string, ctx: EvalContext): EvalResult {
  const parsed = parseFormula(src);
  if (parsed.ast === null) return { value: str("Invalid formula"), error: parsed.error };
  try {
    const value = evalNode(parsed.ast, ctx);
    return { value };
  } catch (e) {
    const err = e as FormulaError;
    return { value: str("Invalid formula"), error: err };
  }
}

function evalNode(node: Node, ctx: EvalContext): FormulaValue {
  if (node.kind === "tmpl") {
    if (node.parts.length === 1 && node.parts[0].kind === "text") {
      return str(node.parts[0].value);
    }
    let out = "";
    for (const p of node.parts) {
      if (p.kind === "text") out += p.value;
      else out += formatFormulaValue(resolveRef(p.name, ctx, p.pos));
    }
    return str(out);
  }
  if (node.kind === "math") {
    return evalExpr(node.expr, ctx);
  }
  if (node.kind === "expr") {
    return evalExpr(node.expr, ctx);
  }
  return NULL_VALUE;
}

function evalExpr(node: ExprNode, ctx: EvalContext): FormulaValue {
  switch (node.kind) {
    case "num": return num(node.value);
    case "str": return str(node.value);
    case "ref": return resolveRef(node.name, ctx, node.pos);
    case "unary": {
      const v = toNumber(evalExpr(node.arg, ctx));
      return num(node.op === "-" ? -v : v);
    }
    case "binop": {
      const l = toNumber(evalExpr(node.left, ctx));
      const r = toNumber(evalExpr(node.right, ctx));
      switch (node.op) {
        case "+": return num(l + r);
        case "-": return num(l - r);
        case "*": return num(l * r);
        case "/": return r === 0 ? num(NaN) : num(l / r);
        case "%": return r === 0 ? num(NaN) : num(l % r);
      }
      return num(NaN);
    }
    case "call": return evalCall(node, ctx);
  }
}

/* ============================================================
 * Property reference resolution
 * ============================================================ */

function resolveRef(name: string, ctx: EvalContext, pos: number): FormulaValue {
  const lc = name.toLowerCase();
  if (lc === "title" || lc === "name") return str(ctx.row.title || "");
  if (lc === "now") return date(new Date().toISOString());
  if (lc === "today") return date(new Date().toISOString().slice(0, 10));

  const prop = ctx.db.properties.find(
    (p) => p.id === name || p.name.toLowerCase() === lc,
  );
  if (!prop) return NULL_VALUE;

  // Circular-dep guard for formula → formula references.
  if (prop.type === "formula") {
    const key = `${ctx.row.id}:${prop.id}`;
    const visited = ctx.visited ?? new Set<string>();
    if (visited.has(key)) {
      throw { message: `Circular reference via {{${name}}}`, pos } as FormulaError;
    }
    if (ctx.cache?.has(key)) return ctx.cache.get(key)!;

    const childCtx: EvalContext = {
      ...ctx,
      visited: new Set(visited).add(key),
      cache: ctx.cache ?? new Map(),
    };
    const result = evalFormula(prop.formulaExpression ?? "", childCtx);
    if (result.error) throw result.error;
    childCtx.cache?.set(key, result.value);
    return result.value;
  }

  return propertyValueToFormulaValue(ctx.row.rowProps?.[prop.id], prop, ctx);
}

function propertyValueToFormulaValue(
  v: PropertyValue | undefined,
  prop: Property,
  ctx: EvalContext,
): FormulaValue {
  if (v === undefined || v === null || v === "") return NULL_VALUE;
  switch (prop.type) {
    case "number":
      return typeof v === "number" ? num(v) : Number.isFinite(Number(v)) ? num(Number(v)) : NULL_VALUE;
    case "checkbox":
      return bool(v === true);
    case "date":
      return typeof v === "object" && "date" in v && v.date ? date(v.date) : NULL_VALUE;
    case "select":
    case "status": {
      const opt = prop.options?.find((o) => o.id === v);
      return str(opt?.name ?? String(v));
    }
    case "multi_select": {
      const ids = Array.isArray(v) ? v : [];
      return list(ids.map((id) => str(prop.options?.find((o) => o.id === id)?.name ?? id)));
    }
    case "relation": {
      const ids = Array.isArray(v) ? v : [];
      return list(
        ids.map((id) => {
          const p = ctx.pages.find((pg) => pg.id === id && !pg.trashed);
          return str(p?.title || "Untitled");
        }),
      );
    }
    case "files": {
      const items = Array.isArray(v) ? v : [];
      return list(items.map((s) => str(s)));
    }
    default:
      return str(String(v));
  }
}

/* ============================================================
 * Function dispatch
 * ============================================================ */

function evalCall(node: { fn: string; args: ExprNode[]; pos: number }, ctx: EvalContext): FormulaValue {
  const name = node.fn;
  const args = node.args.map((a) => evalExpr(a, ctx));

  // Strict arity helpers
  const need = (n: number) => {
    if (args.length < n) throw { message: `'${name}' needs ${n} argument(s)`, pos: node.pos } as FormulaError;
  };

  switch (name) {
    /* String */
    case "concat":
      return str(args.map(toString).join(""));
    case "lower":
      need(1);
      return str(toString(args[0]).toLowerCase());
    case "upper":
      need(1);
      return str(toString(args[0]).toUpperCase());
    case "length":
      need(1);
      return num(toString(args[0]).length);
    case "contains":
      need(2);
      return bool(toString(args[0]).includes(toString(args[1])));
    case "replace":
      need(3);
      return str(toString(args[0]).split(toString(args[1])).join(toString(args[2])));
    case "substring": {
      need(2);
      const s = toString(args[0]);
      const start = Math.max(0, Math.floor(toNumber(args[1])));
      if (args.length >= 3) {
        const len = Math.max(0, Math.floor(toNumber(args[2])));
        return str(s.slice(start, start + len));
      }
      return str(s.slice(start));
    }

    /* Logic */
    case "if":
      need(2);
      return toBoolean(args[0]) ? args[1] : (args[2] ?? NULL_VALUE);
    case "and":
      return bool(args.every(toBoolean));
    case "or":
      return bool(args.some(toBoolean));
    case "not":
      need(1);
      return bool(!toBoolean(args[0]));
    case "empty":
      need(1);
      return bool(isEmpty(args[0]));

    /* Number */
    case "round":
      need(1);
      return num(Math.round(toNumber(args[0])));
    case "floor":
      need(1);
      return num(Math.floor(toNumber(args[0])));
    case "ceil":
      need(1);
      return num(Math.ceil(toNumber(args[0])));
    case "abs":
      need(1);
      return num(Math.abs(toNumber(args[0])));
    case "min":
      return num(Math.min(...args.map(toNumber).filter(Number.isFinite)));
    case "max":
      return num(Math.max(...args.map(toNumber).filter(Number.isFinite)));

    /* Date */
    case "now":
      return date(new Date().toISOString());
    case "today":
      return date(new Date().toISOString().slice(0, 10));
    case "dateadd":
    case "datesubtract": {
      need(3);
      const d = toDate(args[0]);
      if (!d) return NULL_VALUE;
      const n = Math.floor(toNumber(args[1])) * (name === "datesubtract" ? -1 : 1);
      const unit = toString(args[2]).toLowerCase();
      return date(addUnit(d, n, unit));
    }
    case "datebetween": {
      need(3);
      const a = toDate(args[0]);
      const b = toDate(args[1]);
      if (!a || !b) return NULL_VALUE;
      const unit = toString(args[2]).toLowerCase();
      return num(diffUnit(a, b, unit));
    }
    case "formatdate": {
      need(2);
      const d = toDate(args[0]);
      if (!d) return str("");
      return str(formatDate(d, toString(args[1])));
    }

    /* List */
    case "count":
      need(1);
      if (args[0].kind === "list") return num(args[0].value.length);
      if (isEmpty(args[0])) return num(0);
      return num(1);
    case "sum":
      need(1);
      if (args[0].kind === "list") return num(args[0].value.map(toNumber).filter(Number.isFinite).reduce((a, b) => a + b, 0));
      return num(toNumber(args[0]));
    case "join":
      need(1);
      if (args[0].kind === "list") return str(args[0].value.map(toString).join(toString(args[1] ?? str(", "))));
      return str(toString(args[0]));
  }

  throw { message: `Unknown function '${name}'`, pos: node.pos } as FormulaError;
}

/* ============================================================
 * Coercion helpers
 * ============================================================ */

export function toString(v: FormulaValue): string {
  switch (v.kind) {
    case "string": return v.value;
    case "number": return Number.isFinite(v.value) ? String(v.value) : "";
    case "boolean": return v.value ? "true" : "false";
    case "date": return v.value;
    case "null": return "";
    case "list": return v.value.map(toString).join(", ");
  }
}

export function toNumber(v: FormulaValue): number {
  switch (v.kind) {
    case "number": return v.value;
    case "string": return Number(v.value);
    case "boolean": return v.value ? 1 : 0;
    case "date": return new Date(v.value).getTime();
    case "null": return 0;
    case "list": return v.value.length;
  }
}

export function toBoolean(v: FormulaValue): boolean {
  switch (v.kind) {
    case "boolean": return v.value;
    case "number": return v.value !== 0 && !Number.isNaN(v.value);
    case "string": {
      const t = v.value.trim().toLowerCase();
      return t !== "" && t !== "false" && t !== "0" && t !== "no" && t !== "unchecked";
    }
    case "date": return v.value !== "";
    case "null": return false;
    case "list": return v.value.length > 0;
  }
}

function toDate(v: FormulaValue): Date | null {
  if (v.kind === "date" || v.kind === "string") {
    const d = new Date(v.value);
    return Number.isFinite(d.getTime()) ? d : null;
  }
  return null;
}

function isEmpty(v: FormulaValue): boolean {
  if (v.kind === "null") return true;
  if (v.kind === "string") return v.value === "";
  if (v.kind === "list") return v.value.length === 0;
  return false;
}

const DAY_MS = 86_400_000;

function addUnit(d: Date, n: number, unit: string): string {
  const next = new Date(d);
  switch (unit) {
    case "day": case "days": next.setUTCDate(next.getUTCDate() + n); break;
    case "week": case "weeks": next.setUTCDate(next.getUTCDate() + n * 7); break;
    case "month": case "months": next.setUTCMonth(next.getUTCMonth() + n); break;
    case "year": case "years": next.setUTCFullYear(next.getUTCFullYear() + n); break;
    case "hour": case "hours": next.setUTCHours(next.getUTCHours() + n); break;
    case "minute": case "minutes": next.setUTCMinutes(next.getUTCMinutes() + n); break;
    default: next.setUTCDate(next.getUTCDate() + n);
  }
  // Preserve date-only output if the source string was a YYYY-MM-DD.
  return next.toISOString().slice(0, unit.startsWith("hour") || unit.startsWith("minute") ? undefined : 10);
}

function diffUnit(a: Date, b: Date, unit: string): number {
  const ms = b.getTime() - a.getTime();
  switch (unit) {
    case "day": case "days": return Math.round(ms / DAY_MS);
    case "week": case "weeks": return Math.round(ms / (DAY_MS * 7));
    case "month": case "months":
      return (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
    case "year": case "years": return b.getUTCFullYear() - a.getUTCFullYear();
    case "hour": case "hours": return Math.round(ms / 3_600_000);
    case "minute": case "minutes": return Math.round(ms / 60_000);
    default: return Math.round(ms / DAY_MS);
  }
}

function formatDate(d: Date, fmt: string): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return fmt
    .replace(/YYYY/g, String(d.getUTCFullYear()))
    .replace(/MM/g, pad(d.getUTCMonth() + 1))
    .replace(/DD/g, pad(d.getUTCDate()))
    .replace(/HH/g, pad(d.getUTCHours()))
    .replace(/mm/g, pad(d.getUTCMinutes()))
    .replace(/ss/g, pad(d.getUTCSeconds()));
}

/* ============================================================
 * Display
 * ============================================================ */

export function formatFormulaValue(v: FormulaValue): string {
  return toString(v);
}

/* ============================================================
 * Dependency analysis (for static linting / future caching)
 * ============================================================ */

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
