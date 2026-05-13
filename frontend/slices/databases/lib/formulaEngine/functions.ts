import {
  bool, date, list, num, str, NULL_VALUE,
  type ExprNode, type FormulaError, type FormulaValue,
} from "./types";
import { isEmpty, toBoolean, toDate, toNumber, toString } from "./coerce";
import { addUnit, diffUnit, formatDate } from "./dateUtils";

export function evalCall(
  node: { fn: string; args: ExprNode[]; pos: number },
  args: FormulaValue[],
): FormulaValue {
  const name = node.fn;

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
