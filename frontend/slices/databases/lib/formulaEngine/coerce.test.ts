import { describe, expect, it } from "vitest";
import { str, num, bool, date, list, page, NULL_VALUE } from "./types";
import { toString, toNumber, toBoolean, toDate, isEmpty, formatFormulaValue } from "./coerce";

const pg = page({ id: "p1", title: "Alice", icon: "👤" });

describe("coerce toString", () => {
  it("scalars", () => {
    expect(toString(str("hi"))).toBe("hi");
    expect(toString(num(42))).toBe("42");
    expect(toString(bool(true))).toBe("true");
    expect(toString(bool(false))).toBe("false");
    expect(toString(date("2026-01-01"))).toBe("2026-01-01");
    expect(toString(NULL_VALUE)).toBe("");
  });
  it("non-finite number → empty", () => {
    expect(toString(num(NaN))).toBe("");
    expect(toString(num(Infinity))).toBe("");
  });
  it("list joins with ', '", () => {
    expect(toString(list([num(1), str("a"), bool(true)]))).toBe("1, a, true");
  });
  it("page → title", () => {
    expect(toString(pg)).toBe("Alice");
    expect(toString(page({ id: "x", title: "", icon: "" }))).toBe("Untitled");
  });
  it("formatFormulaValue is an alias of toString", () => {
    expect(formatFormulaValue(num(7))).toBe(toString(num(7)));
  });
});

describe("coerce toNumber", () => {
  it("number passthrough; string parse; bool 1/0", () => {
    expect(toNumber(num(3.5))).toBe(3.5);
    expect(toNumber(str("12"))).toBe(12);
    expect(toNumber(bool(true))).toBe(1);
    expect(toNumber(bool(false))).toBe(0);
  });
  it("non-numeric string → NaN", () => {
    expect(Number.isNaN(toNumber(str("abc")))).toBe(true);
  });
  it("date → epoch ms", () => {
    expect(toNumber(date("2026-01-01T00:00:00Z"))).toBe(Date.parse("2026-01-01T00:00:00Z"));
  });
  it("null → 0; list → length; page → NaN", () => {
    expect(toNumber(NULL_VALUE)).toBe(0);
    expect(toNumber(list([num(1), num(2), num(3)]))).toBe(3);
    expect(Number.isNaN(toNumber(pg))).toBe(true);
  });
});

describe("coerce toBoolean", () => {
  it("boolean passthrough", () => {
    expect(toBoolean(bool(true))).toBe(true);
    expect(toBoolean(bool(false))).toBe(false);
  });
  it("number: 0 / NaN → false, else true", () => {
    expect(toBoolean(num(0))).toBe(false);
    expect(toBoolean(num(NaN))).toBe(false);
    expect(toBoolean(num(5))).toBe(true);
    expect(toBoolean(num(-1))).toBe(true);
  });
  it("string falsy-word rules: ''/false/0/no/unchecked → false", () => {
    for (const f of ["", "false", "0", "no", "unchecked", "  FALSE  ", "No"]) {
      expect(toBoolean(str(f))).toBe(false);
    }
    for (const t of ["yes", "true", "1", "x", "anything"]) {
      expect(toBoolean(str(t))).toBe(true);
    }
  });
  it("null → false; empty list → false; non-empty list → true", () => {
    expect(toBoolean(NULL_VALUE)).toBe(false);
    expect(toBoolean(list([]))).toBe(false);
    expect(toBoolean(list([num(1)]))).toBe(true);
  });
  it("date non-empty → true; page → true", () => {
    expect(toBoolean(date("2026-01-01"))).toBe(true);
    expect(toBoolean(date(""))).toBe(false);
    expect(toBoolean(pg)).toBe(true);
  });
});

describe("coerce toDate", () => {
  it("valid iso string/date → Date", () => {
    expect(toDate(date("2026-05-01"))?.getUTCFullYear()).toBe(2026);
    expect(toDate(str("2026-05-01"))?.getUTCMonth()).toBe(4);
  });
  it("invalid string → null", () => {
    expect(toDate(str("not a date"))).toBeNull();
  });
  it("non-date/string kinds → null", () => {
    expect(toDate(num(123))).toBeNull();
    expect(toDate(bool(true))).toBeNull();
    expect(toDate(NULL_VALUE)).toBeNull();
    expect(toDate(pg)).toBeNull();
  });
});

describe("coerce isEmpty", () => {
  it("null / empty string / empty list → true", () => {
    expect(isEmpty(NULL_VALUE)).toBe(true);
    expect(isEmpty(str(""))).toBe(true);
    expect(isEmpty(list([]))).toBe(true);
  });
  it("non-empty values → false", () => {
    expect(isEmpty(str("x"))).toBe(false);
    expect(isEmpty(num(0))).toBe(false);   // 0 is not "empty"
    expect(isEmpty(bool(false))).toBe(false);
    expect(isEmpty(list([num(1)]))).toBe(false);
    expect(isEmpty(pg)).toBe(false);
    expect(isEmpty(date("2026-01-01"))).toBe(false);
  });
});
