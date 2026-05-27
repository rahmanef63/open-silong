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
  | { kind: "unary"; op: "-" | "+" | "!"; arg: ExprNode; pos: number };

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
