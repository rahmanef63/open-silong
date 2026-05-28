/* ============================================================
 * Typed values
 * ============================================================ */

/** Minimal page projection carried inside the engine. Lives here (not in
 *  domain types) so the engine stays self-contained for the rahman-shared
 *  extract (1.G). Drilldown (e.g. `prop("Owner").email`) needs the page's
 *  id + database membership + raw rowProps so member-access can re-enter
 *  the host's `resolvePropertyValue` for any user prop. */
export interface PageEntity {
  id: string;
  title: string;
  icon: string;
  /** When the page is a row of a database, the schema lookup target. */
  rowOfDatabaseId?: string;
  rowProps?: Record<string, unknown>;
}

export type FormulaValue =
  | { kind: "string"; value: string }
  | { kind: "number"; value: number }
  | { kind: "boolean"; value: boolean }
  | { kind: "date"; value: string }
  | { kind: "null" }
  | { kind: "list"; value: FormulaValue[] }
  /** Relation / sub-item targets resolve to this so `.member` access can
   *  drill into the underlying page's properties. `toString` returns the
   *  page title, so existing `concat(prop("Owner"))`-style formulas keep
   *  printing names unchanged. */
  | { kind: "page"; value: PageEntity };

export const NULL_VALUE: FormulaValue = { kind: "null" };
export const str = (v: string): FormulaValue => ({ kind: "string", value: v });
export const num = (v: number): FormulaValue => ({ kind: "number", value: v });
export const bool = (v: boolean): FormulaValue => ({ kind: "boolean", value: v });
export const date = (v: string): FormulaValue => ({ kind: "date", value: v });
export const list = (v: FormulaValue[]): FormulaValue => ({ kind: "list", value: v });
export const page = (v: PageEntity): FormulaValue => ({ kind: "page", value: v });

/* ============================================================
 * AST
 * ============================================================ */

export type Node =
  | { kind: "tmpl"; parts: TemplatePart[] }
  | { kind: "math"; expr: ExprNode }
  | { kind: "expr"; expr: ExprNode };

export type TemplatePart =
  | { kind: "text"; value: string }
  | { kind: "ref"; name: string; pos: number };

export type ExprNode =
  | { kind: "num"; value: number; pos: number }
  | { kind: "str"; value: string; pos: number }
  | { kind: "bool"; value: boolean; pos: number }
  | { kind: "ref"; name: string; pos: number }
  | { kind: "call"; fn: string; args: ExprNode[]; pos: number }
  | { kind: "binop"; op: BinOp; left: ExprNode; right: ExprNode; pos: number }
  | { kind: "unary"; op: "-" | "+" | "!"; arg: ExprNode; pos: number }
  /** Postfix `.ident` access chain — drills into a page entity's built-in
   *  field (title / icon / id) or a user-defined property by name. Lists
   *  of pages map the access over each element. Pure scalars resolve to
   *  NULL. Built by the parser as a left-associative chain after primary. */
  | { kind: "member"; object: ExprNode; member: string; pos: number }
  /** Arrow lambda — `name => body` or `(a, b) => body`. Only meaningful
   *  when passed as an arg to a higher-order fn (map/filter/reduce/etc);
   *  outside that context it evaluates to NULL. Body is parsed via the
   *  full expression precedence ladder so it can carry any subexpression. */
  | { kind: "lambda"; params: string[]; body: ExprNode; pos: number };

export type BinOp =
  // Arithmetic
  | "+" | "-" | "*" | "/" | "%"
  // Comparison
  | ">" | "<" | ">=" | "<="
  // Equality
  | "==" | "!="
  // Logical (short-circuit at eval time)
  | "&&" | "||";

/* ============================================================
 * Errors
 * ============================================================ */

export interface FormulaError {
  message: string;
  pos: number;
  end?: number;
}
