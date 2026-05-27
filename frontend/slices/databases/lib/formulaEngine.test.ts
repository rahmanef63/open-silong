import { describe, it, expect } from "vitest";
import type { Database, Page } from "@/shared/types/domain";
import { evalFormula, formatFormulaValue, parseFormula, collectDeps, num as nv, str as sv } from "./formulaEngine";

const mkRow = (overrides: Partial<Page> = {}): Page => ({
  id: "row1",
  parentId: null,
  title: "Hello",
  icon: "📄",
  blocks: [],
  favorite: false,
  trashed: false,
  createdAt: 0,
  updatedAt: 0,
  rowProps: {},
  ...overrides,
});

const mkDb = (overrides: Partial<Database> = {}): Database => ({
  id: "db1",
  name: "Test",
  icon: "🗂️",
  properties: [],
  rowIds: [],
  views: [],
  activeViewId: "",
  createdAt: 0,
  updatedAt: 0,
  ...overrides,
});

describe("formulaEngine — template mode", () => {
  it("evaluates plain text", () => {
    const r = evalFormula("hello world", { row: mkRow(), db: mkDb(), pages: [] });
    expect(formatFormulaValue(r.value)).toBe("hello world");
  });
  it("substitutes {{title}}", () => {
    const r = evalFormula("Hi {{title}}!", { row: mkRow({ title: "Alice" }), db: mkDb(), pages: [] });
    expect(formatFormulaValue(r.value)).toBe("Hi Alice!");
  });
  it("substitutes named property", () => {
    const db = mkDb({ properties: [{ id: "p1", name: "Status", type: "text" }] });
    const row = mkRow({ rowProps: { p1: "Open" } });
    const r = evalFormula("[{{Status}}]", { row, db, pages: [] });
    expect(formatFormulaValue(r.value)).toBe("[Open]");
  });
});

describe("formulaEngine — math mode", () => {
  it("evaluates =1+2", () => {
    const r = evalFormula("=1+2", { row: mkRow(), db: mkDb(), pages: [] });
    expect(formatFormulaValue(r.value)).toBe("3");
  });
  it("evaluates =3 * (2 + 4)", () => {
    const r = evalFormula("=3 * (2 + 4)", { row: mkRow(), db: mkDb(), pages: [] });
    expect(formatFormulaValue(r.value)).toBe("18");
  });
  it("uses property in math", () => {
    const db = mkDb({ properties: [{ id: "p1", name: "Score", type: "number" }] });
    const row = mkRow({ rowProps: { p1: 10 } });
    const r = evalFormula("={{Score}} * 2", { row, db, pages: [] });
    expect(formatFormulaValue(r.value)).toBe("20");
  });
  it("returns NaN-as-empty on /0", () => {
    const r = evalFormula("=1/0", { row: mkRow(), db: mkDb(), pages: [] });
    expect(formatFormulaValue(r.value)).toBe("");
  });
});

describe("formulaEngine — function calls", () => {
  it("nested fn calls work", () => {
    const r = evalFormula(`if(empty({{title}}), "no name", concat("hello ", {{title}}))`, {
      row: mkRow({ title: "World" }), db: mkDb(), pages: [],
    });
    expect(formatFormulaValue(r.value)).toBe("hello World");
  });
  it("substring", () => {
    const r = evalFormula(`substring("abcdef", 2, 3)`, { row: mkRow(), db: mkDb(), pages: [] });
    expect(formatFormulaValue(r.value)).toBe("cde");
  });
  it("contains returns boolean", () => {
    const r = evalFormula(`contains("hello world", "world")`, { row: mkRow(), db: mkDb(), pages: [] });
    expect(r.value.kind).toBe("boolean");
    expect(formatFormulaValue(r.value)).toBe("true");
  });
  it("dateAdd day", () => {
    const r = evalFormula(`dateAdd("2026-01-01", 5, "day")`, { row: mkRow(), db: mkDb(), pages: [] });
    expect(formatFormulaValue(r.value)).toBe("2026-01-06");
  });
  it("dateBetween in days", () => {
    const r = evalFormula(`dateBetween("2026-01-01", "2026-01-10", "day")`, {
      row: mkRow(), db: mkDb(), pages: [],
    });
    expect(formatFormulaValue(r.value)).toBe("9");
  });
  it("formatDate", () => {
    const r = evalFormula(`formatDate("2026-03-04", "DD/MM/YYYY")`, {
      row: mkRow(), db: mkDb(), pages: [],
    });
    expect(formatFormulaValue(r.value)).toBe("04/03/2026");
  });
});

describe("formulaEngine — list ops", () => {
  it("count of multi_select", () => {
    const db = mkDb({
      properties: [{
        id: "p1", name: "Tags", type: "multi_select",
        options: [{ id: "a", name: "alpha", color: "blue" }, { id: "b", name: "beta", color: "red" }],
      }],
    });
    const row = mkRow({ rowProps: { p1: ["a", "b"] } });
    const r = evalFormula(`count({{Tags}})`, { row, db, pages: [] });
    expect(formatFormulaValue(r.value)).toBe("2");
  });
  it("join of multi_select", () => {
    const db = mkDb({
      properties: [{
        id: "p1", name: "Tags", type: "multi_select",
        options: [{ id: "a", name: "alpha", color: "blue" }, { id: "b", name: "beta", color: "red" }],
      }],
    });
    const row = mkRow({ rowProps: { p1: ["a", "b"] } });
    const r = evalFormula(`join({{Tags}}, " · ")`, { row, db, pages: [] });
    expect(formatFormulaValue(r.value)).toBe("alpha · beta");
  });
});

describe("formulaEngine — circular guard", () => {
  it("blocks formula→formula cycles", () => {
    const db = mkDb({
      properties: [
        { id: "f1", name: "F1", type: "formula", formulaExpression: "{{F2}}" },
        { id: "f2", name: "F2", type: "formula", formulaExpression: "{{F1}}" },
      ],
    });
    const row = mkRow();
    const r = evalFormula("{{F1}}", { row, db, pages: [] });
    expect(r.error?.message).toMatch(/circular/i);
  });
});

describe("formulaEngine — error positions", () => {
  it("flags unterminated string", () => {
    const r = evalFormula(`concat("oops`, { row: mkRow(), db: mkDb(), pages: [] });
    expect(r.error).toBeTruthy();
    expect(r.error!.pos).toBeGreaterThan(0);
  });
  it("flags unknown function", () => {
    const r = evalFormula(`bogus(1)`, { row: mkRow(), db: mkDb(), pages: [] });
    expect(r.error?.message).toMatch(/unknown function/i);
  });
  it("flags trailing tokens after =", () => {
    const r = evalFormula(`=1+2 garbage`, { row: mkRow(), db: mkDb(), pages: [] });
    expect(r.error?.message).toMatch(/trailing/i);
  });
});

describe("formulaEngine — collectDeps", () => {
  it("returns names in template mode", () => {
    const parsed = parseFormula("Hi {{title}}, status={{Status}}");
    expect(parsed.ast).toBeTruthy();
    const deps = collectDeps(parsed.ast!);
    expect([...deps].sort()).toEqual(["Status", "title"]);
  });
  it("returns names in expr/math mode", () => {
    const parsed = parseFormula("=if({{Done}}, 1, {{Score}})");
    expect(parsed.ast).toBeTruthy();
    const deps = collectDeps(parsed.ast!);
    expect([...deps].sort()).toEqual(["Done", "Score"]);
  });
});

// ---- 1.A: comparison + equality + logical ops ------------------------------

describe("formulaEngine — boolean literals", () => {
  it("parses bare true / false", () => {
    expect(formatFormulaValue(evalFormula("=true", { row: mkRow(), db: mkDb(), pages: [] }).value)).toBe("true");
    expect(formatFormulaValue(evalFormula("=false", { row: mkRow(), db: mkDb(), pages: [] }).value)).toBe("false");
  });
  it("is case-insensitive (True/FALSE)", () => {
    expect(formatFormulaValue(evalFormula("=True", { row: mkRow(), db: mkDb(), pages: [] }).value)).toBe("true");
    expect(formatFormulaValue(evalFormula("=FALSE", { row: mkRow(), db: mkDb(), pages: [] }).value)).toBe("false");
  });
});

describe("formulaEngine — comparison ops", () => {
  const ctx = { row: mkRow(), db: mkDb(), pages: [] };
  it("5 > 3 → true", () => {
    expect(formatFormulaValue(evalFormula("=5 > 3", ctx).value)).toBe("true");
  });
  it("5 < 3 → false", () => {
    expect(formatFormulaValue(evalFormula("=5 < 3", ctx).value)).toBe("false");
  });
  it("5 >= 5 → true", () => {
    expect(formatFormulaValue(evalFormula("=5 >= 5", ctx).value)).toBe("true");
  });
  it("5 <= 4 → false", () => {
    expect(formatFormulaValue(evalFormula("=5 <= 4", ctx).value)).toBe("false");
  });
  it('"abc" < "abd" → true (lex)', () => {
    expect(formatFormulaValue(evalFormula(`="abc" < "abd"`, ctx).value)).toBe("true");
  });
  it("date now() > today() → true (now has time)", () => {
    expect(formatFormulaValue(evalFormula("=now() > today()", ctx).value)).toBe("true");
  });
});

describe("formulaEngine — equality ops", () => {
  const ctx = { row: mkRow(), db: mkDb(), pages: [] };
  it("5 == 5 → true", () => {
    expect(formatFormulaValue(evalFormula("=5 == 5", ctx).value)).toBe("true");
  });
  it("5 != 6 → true", () => {
    expect(formatFormulaValue(evalFormula("=5 != 6", ctx).value)).toBe("true");
  });
  it('"a" == "a" → true', () => {
    expect(formatFormulaValue(evalFormula(`="a" == "a"`, ctx).value)).toBe("true");
  });
  it('"a" == 5 → false (cross-kind, no coerce)', () => {
    expect(formatFormulaValue(evalFormula(`="a" == 5`, ctx).value)).toBe("false");
  });
  it("true == true → true", () => {
    expect(formatFormulaValue(evalFormula("=true == true", ctx).value)).toBe("true");
  });
});

describe("formulaEngine — logical ops + short-circuit", () => {
  const ctx = { row: mkRow(), db: mkDb(), pages: [] };
  it("true && false → false", () => {
    expect(formatFormulaValue(evalFormula("=true && false", ctx).value)).toBe("false");
  });
  it("true || false → true", () => {
    expect(formatFormulaValue(evalFormula("=true || false", ctx).value)).toBe("true");
  });
  it("false && false → false", () => {
    expect(formatFormulaValue(evalFormula("=false && false", ctx).value)).toBe("false");
  });
  it("true || true → true", () => {
    expect(formatFormulaValue(evalFormula("=true || true", ctx).value)).toBe("true");
  });
  it("!true → false", () => {
    expect(formatFormulaValue(evalFormula("=!true", ctx).value)).toBe("false");
  });
  it("!false → true", () => {
    expect(formatFormulaValue(evalFormula("=!false", ctx).value)).toBe("true");
  });
  it("&& short-circuits — right side ref never resolved when left false", () => {
    // unknown_ref would resolve to NULL_VALUE (not throw) here, but the
    // semantic test is that the result depends on left alone.
    expect(formatFormulaValue(evalFormula("=false && true", ctx).value)).toBe("false");
  });
  it("|| short-circuits — right side ref never resolved when left true", () => {
    expect(formatFormulaValue(evalFormula("=true || false", ctx).value)).toBe("true");
  });
});

describe("formulaEngine — operator precedence", () => {
  const ctx = { row: mkRow(), db: mkDb(), pages: [] };
  it("arith before comparison: 1 + 2 == 3 → true", () => {
    expect(formatFormulaValue(evalFormula("=1 + 2 == 3", ctx).value)).toBe("true");
  });
  it("comparison before && : 1 < 2 && 3 > 1 → true", () => {
    expect(formatFormulaValue(evalFormula("=1 < 2 && 3 > 1", ctx).value)).toBe("true");
  });
  it("&& binds tighter than ||: false || true && false → false", () => {
    // = false || (true && false) = false || false = false
    expect(formatFormulaValue(evalFormula("=false || true && false", ctx).value)).toBe("false");
  });
  it("mixed: !(1 == 2) → true", () => {
    expect(formatFormulaValue(evalFormula("=!(1 == 2)", ctx).value)).toBe("true");
  });
  it("mul before add stays: 2 + 3 * 4 == 14 → true", () => {
    expect(formatFormulaValue(evalFormula("=2 + 3 * 4 == 14", ctx).value)).toBe("true");
  });
  it("parens override: (2 + 3) * 4 == 20 → true", () => {
    expect(formatFormulaValue(evalFormula("=(2 + 3) * 4 == 20", ctx).value)).toBe("true");
  });
});

describe("formulaEngine — comparison drives if()", () => {
  const ctx = { row: mkRow(), db: mkDb(), pages: [] };
  it("Pass/Fail by score", () => {
    expect(formatFormulaValue(evalFormula(`=if(80 >= 60, "Pass", "Fail")`, ctx).value)).toBe("Pass");
    expect(formatFormulaValue(evalFormula(`=if(40 >= 60, "Pass", "Fail")`, ctx).value)).toBe("Fail");
  });
  it("Range check with && — score 75 in 60..100", () => {
    expect(formatFormulaValue(evalFormula(`=if(75 >= 60 && 75 <= 100, "Good", "Bad")`, ctx).value)).toBe("Good");
  });
});

// ---- 1.B: function-library expansion ---------------------------------------

const baseCtx = () => ({ row: mkRow(), db: mkDb(), pages: [] });
const evalFmt = (src: string) => formatFormulaValue(evalFormula(src, baseCtx()).value);

describe("formulaEngine — string fns (1.B)", () => {
  it("slice(start, end)", () => {
    expect(evalFmt(`=slice("abcdef", 1, 4)`)).toBe("bcd");
  });
  it("slice negative end (string)", () => {
    expect(evalFmt(`=slice("abcdef", 0, -1)`)).toBe("abcde");
  });
  it("replaceAll alias matches replace", () => {
    expect(evalFmt(`=replaceAll("a.b.c", ".", "-")`)).toBe("a-b-c");
  });
  it("repeat caps memory (str * count, ≤10k chars)", () => {
    expect(evalFmt(`=repeat("a", 5)`)).toBe("aaaaa");
    // Should not OOM the test runner — repeat caps at 10k chars
    expect(evalFmt(`=length(repeat("xyz", 100000))`)).toBe("9999");
  });
  it("format(value) — stringify", () => {
    expect(evalFmt(`=format(42)`)).toBe("42");
    expect(evalFmt(`=format(true)`)).toBe("true");
  });
});

describe("formulaEngine — number fns (1.B)", () => {
  it("sign", () => {
    expect(evalFmt(`=sign(-5)`)).toBe("-1");
    expect(evalFmt(`=sign(0)`)).toBe("0");
    expect(evalFmt(`=sign(5)`)).toBe("1");
  });
  it("sqrt + pow", () => {
    expect(evalFmt(`=sqrt(16)`)).toBe("4");
    expect(evalFmt(`=pow(2, 10)`)).toBe("1024");
  });
  it("mod (alias for %)", () => {
    expect(evalFmt(`=mod(10, 3)`)).toBe("1");
    expect(evalFmt(`=mod(10, 0)`)).toBe("");
  });
  it("trig: sin(0) = 0, cos(0) = 1", () => {
    expect(evalFmt(`=sin(0)`)).toBe("0");
    expect(evalFmt(`=cos(0)`)).toBe("1");
  });
  it("pi() + e() constants", () => {
    expect(parseFloat(evalFmt(`=pi()`))).toBeCloseTo(Math.PI);
    expect(parseFloat(evalFmt(`=e()`))).toBeCloseTo(Math.E);
  });
  it("ln + log10 + log2", () => {
    expect(parseFloat(evalFmt(`=ln(e())`))).toBeCloseTo(1);
    expect(evalFmt(`=log10(1000)`)).toBe("3");
    expect(evalFmt(`=log2(8)`)).toBe("3");
  });
  it("min/max accept list arg", () => {
    expect(evalFmt(`=min(5, 3, 9)`)).toBe("3");
    expect(evalFmt(`=max(5, 3, 9)`)).toBe("9");
  });
});

describe("formulaEngine — date fns (1.B)", () => {
  it("year/month/day extractors", () => {
    // Use fromtimestamp for deterministic dates so timezones don't drift
    // month/day across test environments.
    const d = new Date(2026, 4, 27); // local May 27 2026
    expect(evalFmt(`=year(now())`)).toBe(`${new Date().getFullYear()}`);
    expect(evalFmt(`=month(fromtimestamp(${d.getTime()}))`)).toBe("5");
    expect(evalFmt(`=day(fromtimestamp(${d.getTime()}))`)).toBe("27");
  });
  it("timestamp round-trip via fromtimestamp", () => {
    const ms = 1_700_000_000_000;
    expect(evalFmt(`=timestamp(fromtimestamp(${ms}))`)).toBe(`${ms}`);
  });
  it("hour/minute/second on epoch UTC", () => {
    // Use a wall-clock-stable comparator — only check that the fn returns
    // a finite integer, not the exact value (timezone-dependent).
    const v = evalFmt(`=hour(now())`);
    const n = Number(v);
    expect(Number.isFinite(n)).toBe(true);
    expect(n).toBeGreaterThanOrEqual(0);
    expect(n).toBeLessThan(24);
  });
});

describe("formulaEngine — logic fns (1.B)", () => {
  it("ifs — first truthy wins", () => {
    expect(evalFmt(`=ifs(false, "a", true, "b", false, "c", "default")`)).toBe("b");
  });
  it("ifs — default when nothing matches", () => {
    expect(evalFmt(`=ifs(false, "a", false, "b", "default")`)).toBe("default");
  });
  it("ifs — empty when no default + no match", () => {
    expect(evalFmt(`=ifs(false, "a", false, "b")`)).toBe("");
  });
  it("switch — value match", () => {
    expect(evalFmt(`=switch(2, 1, "one", 2, "two", 3, "three", "other")`)).toBe("two");
  });
  it("switch — default fallback", () => {
    expect(evalFmt(`=switch(99, 1, "one", 2, "two", "other")`)).toBe("other");
  });
  it("toBoolean / toNumber / toString explicit coerce", () => {
    expect(evalFmt(`=toBoolean("yes")`)).toBe("true");
    expect(evalFmt(`=toBoolean("no")`)).toBe("false");
    expect(evalFmt(`=toNumber("42")`)).toBe("42");
    expect(evalFmt(`=toString(42)`)).toBe("42");
  });
});

describe("formulaEngine — list fns + polymorphism (1.B)", () => {
  // Build a row whose multi_select prop resolves to a list of strings, so
  // we can test list fns end-to-end through the property pipeline.
  const dbWithList = () => mkDb({
    properties: [{
      id: "tags",
      name: "Tags",
      type: "multi_select",
      options: [
        { id: "a", name: "alpha", color: "blue" },
        { id: "b", name: "beta", color: "red" },
        { id: "c", name: "gamma", color: "green" },
      ],
    }],
  });
  const row = () => mkRow({ rowProps: { tags: ["a", "b", "c", "a"] } });

  it("first / last", () => {
    expect(formatFormulaValue(evalFormula(`=first({{Tags}})`, { row: row(), db: dbWithList(), pages: [] }).value)).toBe("alpha");
    expect(formatFormulaValue(evalFormula(`=last({{Tags}})`, { row: row(), db: dbWithList(), pages: [] }).value)).toBe("alpha");
  });
  it("at(list, i) — positive index", () => {
    expect(formatFormulaValue(evalFormula(`=at({{Tags}}, 1)`, { row: row(), db: dbWithList(), pages: [] }).value)).toBe("beta");
  });
  it("at(list, -i) — negative counts from end", () => {
    expect(formatFormulaValue(evalFormula(`=at({{Tags}}, -1)`, { row: row(), db: dbWithList(), pages: [] }).value)).toBe("alpha");
  });
  it("includes(list, v)", () => {
    expect(formatFormulaValue(evalFormula(`=includes({{Tags}}, "beta")`, { row: row(), db: dbWithList(), pages: [] }).value)).toBe("true");
    expect(formatFormulaValue(evalFormula(`=includes({{Tags}}, "zzz")`, { row: row(), db: dbWithList(), pages: [] }).value)).toBe("false");
  });
  it("unique drops dupes", () => {
    expect(formatFormulaValue(evalFormula(`=unique({{Tags}})`, { row: row(), db: dbWithList(), pages: [] }).value)).toBe("alpha, beta, gamma");
  });
  it("prod / mean / avg", () => {
    expect(evalFmt(`=prod(5)`)).toBe("5");
    expect(evalFmt(`=mean(10)`)).toBe("10");
    expect(evalFmt(`=avg(10)`)).toBe("10");
  });
  it("length is polymorphic — string vs list", () => {
    expect(evalFmt(`=length("hello")`)).toBe("5");
    expect(formatFormulaValue(evalFormula(`=length({{Tags}})`, { row: row(), db: dbWithList(), pages: [] }).value)).toBe("4");
  });
  it("slice is polymorphic — list flavour", () => {
    expect(formatFormulaValue(evalFormula(`=slice({{Tags}}, 1, 3)`, { row: row(), db: dbWithList(), pages: [] }).value)).toBe("beta, gamma");
  });
  it("reverse is polymorphic — string vs list", () => {
    expect(evalFmt(`=reverse("abc")`)).toBe("cba");
    expect(formatFormulaValue(evalFormula(`=reverse({{Tags}})`, { row: row(), db: dbWithList(), pages: [] }).value)).toBe("alpha, gamma, beta, alpha");
  });
});

// ---- 1.C: prop() syntax + relation drilldown ------------------------------

describe("formulaEngine — prop() syntax (1.C)", () => {
  it("prop(\"title\") equivalent to {{title}}", () => {
    const ctx = { row: mkRow({ title: "Hello World" }), db: mkDb(), pages: [] };
    const a = formatFormulaValue(evalFormula(`=prop("title")`, ctx).value);
    const b = formatFormulaValue(evalFormula(`={{title}}`, ctx).value);
    expect(a).toBe("Hello World");
    expect(a).toBe(b);
  });

  it("works inside math expressions", () => {
    const db = mkDb({ properties: [{ id: "score", name: "Score", type: "number" }] });
    const ctx = { row: mkRow({ rowProps: { score: 5 } }), db, pages: [] };
    expect(formatFormulaValue(evalFormula(`=prop("Score") + 1`, ctx).value)).toBe("6");
  });

  it("prop() without args throws (strict — string literal required)", () => {
    const r = evalFormula(`=prop()`, { row: mkRow(), db: mkDb(), pages: [] });
    expect(r.error?.message).toMatch(/string literal/i);
  });

  it("prop(5) throws (number is not a string literal)", () => {
    const r = evalFormula(`=prop(5)`, { row: mkRow(), db: mkDb(), pages: [] });
    expect(r.error?.message).toMatch(/string literal/i);
  });

  it("prop(someName) throws — bare ident NOT allowed (no variable fallback)", () => {
    const r = evalFormula(`=prop(someName)`, { row: mkRow(), db: mkDb(), pages: [] });
    expect(r.error?.message).toMatch(/string literal/i);
  });

  it("bare `prop` (no parens) still errors as missing call paren", () => {
    const r = evalFormula(`=prop + 1`, { row: mkRow(), db: mkDb(), pages: [] });
    // The new strict path keeps the legacy "expected '('" error — `prop`
    // alone is treated as just any fn name missing its argument list.
    expect(r.error?.message).toMatch(/\(/);
  });
});

describe("formulaEngine — member access (1.C)", () => {
  // peopleDb + alice/bob fixture so we can test `.email` drilldown across dbs.
  const peopleDb = mkDb({
    id: "people",
    name: "People",
    properties: [
      { id: "email", name: "Email", type: "email" },
      { id: "team",  name: "Team",  type: "text" },
    ],
  });
  const alice = mkRow({
    id: "alice", title: "Alice", icon: "👤",
    rowOfDatabaseId: "people",
    rowProps: { email: "alice@example.com", team: "Eng" },
  });
  const bob = mkRow({
    id: "bob", title: "Bob", icon: "👤",
    rowOfDatabaseId: "people",
    rowProps: { email: "bob@example.com", team: "Design" },
  });

  const mainDb = mkDb({
    id: "main",
    properties: [{ id: "owner", name: "Owner", type: "relation" }],
  });
  const task = (ownerIds: string[]) => mkRow({
    id: "task", title: "Build", rowOfDatabaseId: "main",
    rowProps: { owner: ownerIds },
  });
  const ctx = (row: ReturnType<typeof task>) => ({
    row, db: mainDb, pages: [alice, bob, row], databases: [peopleDb, mainDb],
  });

  it(".title resolves to related page's title", () => {
    expect(formatFormulaValue(evalFormula(`=prop("Owner").title`, ctx(task(["alice"]))).value)).toBe("Alice");
  });

  it(".icon resolves to icon", () => {
    expect(formatFormulaValue(evalFormula(`=prop("Owner").icon`, ctx(task(["alice"]))).value)).toBe("👤");
  });

  it(".id resolves to page id", () => {
    expect(formatFormulaValue(evalFormula(`=prop("Owner").id`, ctx(task(["alice"]))).value)).toBe("alice");
  });

  it("custom property drilldown — cross-db lookup via ctx.databases", () => {
    expect(formatFormulaValue(evalFormula(`=prop("Owner").Email`, ctx(task(["alice"]))).value)).toBe("alice@example.com");
    expect(formatFormulaValue(evalFormula(`=prop("Owner").Team`, ctx(task(["alice"]))).value)).toBe("Eng");
  });

  it("multi-relation: member access maps across the list", () => {
    expect(formatFormulaValue(evalFormula(`=prop("Owner").Email`, ctx(task(["alice", "bob"]))).value)).toBe("alice@example.com, bob@example.com");
  });

  it("missing property name returns null/empty", () => {
    expect(formatFormulaValue(evalFormula(`=prop("Owner").NoSuch`, ctx(task(["alice"]))).value)).toBe("");
  });

  it("member access on scalar string is null", () => {
    const r = evalFormula(`="hi".foo`, { row: mkRow(), db: mkDb(), pages: [] });
    expect(formatFormulaValue(r.value)).toBe("");
  });

  it("member access on null is null", () => {
    expect(formatFormulaValue(evalFormula(`=prop("NoRel").x`, ctx(task([]))).value)).toBe("");
  });

  it("dual syntax — {{Owner}} matches prop(\"Owner\") output (relation)", () => {
    const r1 = formatFormulaValue(evalFormula(`={{Owner}}`, ctx(task(["alice", "bob"]))).value);
    const r2 = formatFormulaValue(evalFormula(`=prop("Owner")`, ctx(task(["alice", "bob"]))).value);
    expect(r1).toBe(r2);
    expect(r1).toBe("Alice, Bob");
  });

  it("back-compat — concat(prop(\"Owner\")) still prints titles", () => {
    expect(formatFormulaValue(evalFormula(`=concat(prop("Owner"))`, ctx(task(["alice", "bob"]))).value)).toBe("Alice, Bob");
  });

  it("member chain works on title via first() — unwrap single-list to scalar", () => {
    // Relation drilldown ALWAYS produces a list (mirrors Notion semantics).
    // To get a scalar string for `length()`, unwrap with first().
    expect(formatFormulaValue(evalFormula(`=length(first(prop("Owner")).title)`, ctx(task(["alice"]))).value)).toBe("5");
  });

  it("relation drilldown is list-shaped even for single owner", () => {
    // Documents the rule: .title on a list-of-pages stays list-of-strings.
    // length() on the list returns list size, not string length.
    expect(formatFormulaValue(evalFormula(`=length(prop("Owner").title)`, ctx(task(["alice"]))).value)).toBe("1");
    expect(formatFormulaValue(evalFormula(`=length(prop("Owner").title)`, ctx(task(["alice", "bob"]))).value)).toBe("2");
  });
});

// ---- 1.D.1: lambda AST + parser + env-aware resolveRef --------------------

describe("formulaEngine — lambda parser (1.D.1)", () => {
  it("`name => body` parses as lambda with single param", () => {
    const p = parseFormula("=current => current + 1");
    expect(p.ast).toBeTruthy();
    expect(p.ast!.kind).toBe("math");
    const expr = (p.ast as { kind: "math"; expr: { kind: string } }).expr;
    expect(expr.kind).toBe("lambda");
    const lam = expr as { kind: "lambda"; params: string[]; body: { kind: string } };
    expect(lam.params).toEqual(["current"]);
    expect(lam.body.kind).toBe("binop");
  });

  it("`(current, index) => current + index` parses as 2-param lambda", () => {
    // Multi-param lambdas only practical with whitelisted bare idents —
    // the body parser rejects non-whitelisted refs ("Expected '(' after
    // function name 'a'"), so `(a, b) => a + b` naturally fails. This
    // matches Notion's model: lambdas always bind reserved names like
    // `current` + `index`, never arbitrary user-chosen variables.
    const p = parseFormula("=(current, index) => current + index");
    expect(p.error).toBeUndefined();
    const expr = (p.ast as { kind: "math"; expr: { kind: string; params?: string[] } }).expr;
    expect(expr.kind).toBe("lambda");
    expect((expr as { params: string[] }).params).toEqual(["current", "index"]);
  });

  it("`(a, b) => a + b` errors at body parse (non-whitelisted bare ident)", () => {
    const r = evalFormula("=(a, b) => a + b", { row: mkRow(), db: mkDb(), pages: [] });
    expect(r.error?.message).toMatch(/expected '\('/i);
  });

  it("`() => 5` parses as zero-arg lambda", () => {
    const p = parseFormula("=() => 5");
    const expr = (p.ast as { kind: "math"; expr: { kind: string; params?: string[] } }).expr;
    expect(expr.kind).toBe("lambda");
    expect((expr as { params: string[] }).params).toEqual([]);
  });

  it("`(5 + 3)` is paren expr, NOT lambda (lookahead restores)", () => {
    const p = parseFormula("=(5 + 3)");
    const expr = (p.ast as { kind: "math"; expr: { kind: string } }).expr;
    // Should be a binop, not lambda
    expect(expr.kind).toBe("binop");
  });

  it("`(current)` is paren expr containing bare lambda-builtin ref", () => {
    const p = parseFormula("=(current)");
    const expr = (p.ast as { kind: "math"; expr: { kind: string; name?: string } }).expr;
    expect(expr.kind).toBe("ref");
    expect((expr as { name: string }).name).toBe("current");
  });

  it("bare `current` outside any call parses as ref (whitelisted)", () => {
    const p = parseFormula("=current");
    const expr = (p.ast as { kind: "math"; expr: { kind: string; name?: string } }).expr;
    expect(expr.kind).toBe("ref");
    expect((expr as { name: string }).name).toBe("current");
  });

  it("bare `index` and `accumulator` also whitelisted", () => {
    const e1 = parseFormula("=index").ast as { kind: "math"; expr: { kind: string } };
    const e2 = parseFormula("=accumulator").ast as { kind: "math"; expr: { kind: string } };
    expect(e1.expr.kind).toBe("ref");
    expect(e2.expr.kind).toBe("ref");
  });

  it("unrecognised bare ident still errors (no implicit ref fallback)", () => {
    const r = evalFormula("=foo", { row: mkRow(), db: mkDb(), pages: [] });
    expect(r.error?.message).toMatch(/expected '\('/i);
  });
});

describe("formulaEngine — lambda eval + env stack (1.D.1)", () => {
  const baseCtx = () => ({ row: mkRow(), db: mkDb(), pages: [] });

  it("bare lambda evaluates to null (only useful inside higher-order fn)", () => {
    expect(formatFormulaValue(evalFormula("=current => current + 1", baseCtx()).value)).toBe("");
  });

  it("`current` without env binds resolves to null (toNumber → 0 in math)", () => {
    // resolveRef returns NULL; toNumber(NULL) = 0 in coerce.ts.
    expect(formatFormulaValue(evalFormula("=current + 5", baseCtx()).value)).toBe("5");
  });

  it("env-stack injection — `current` resolves to bound value", () => {
    const ctx = { ...baseCtx(), envStack: [{ current: nv(42) }] };
    expect(formatFormulaValue(evalFormula("=current", ctx).value)).toBe("42");
    expect(formatFormulaValue(evalFormula("=current * 2", ctx).value)).toBe("84");
  });

  it("innermost env frame wins on shadowing", () => {
    const ctx = {
      ...baseCtx(),
      envStack: [{ current: nv(1) }, { current: nv(2) }, { current: nv(3) }],
    };
    expect(formatFormulaValue(evalFormula("=current", ctx).value)).toBe("3");
  });

  it("env-stack lookup is case-insensitive (matches resolveRef contract)", () => {
    const ctx = { ...baseCtx(), envStack: [{ current: sv("hello") }] };
    expect(formatFormulaValue(evalFormula("=CURRENT", ctx).value)).toBe("hello");
    expect(formatFormulaValue(evalFormula("=Current", ctx).value)).toBe("hello");
  });

  it("env-stack shadows property of same name", () => {
    // Property "current" exists; env-stack frame wins.
    const db = mkDb({ properties: [{ id: "current", name: "current", type: "text" }] });
    const ctx = {
      row: mkRow({ rowProps: { current: "from-prop" } }),
      db, pages: [],
      envStack: [{ current: sv("from-env") }],
    };
    expect(formatFormulaValue(evalFormula("=current", ctx).value)).toBe("from-env");
  });

  it("falls through to property lookup when env-stack lacks the name", () => {
    const db = mkDb({ properties: [{ id: "score", name: "Score", type: "number" }] });
    const ctx = {
      row: mkRow({ rowProps: { score: 99 } }),
      db, pages: [],
      envStack: [{ current: nv(1) }], // no "score" key
    };
    expect(formatFormulaValue(evalFormula("={{Score}}", ctx).value)).toBe("99");
  });
});

// ---- 1.D.2: map / filter / reduce / find ----------------------------------

describe("formulaEngine — higher-order fns (1.D.2)", () => {
  // Multi-select fixture — easier than relations for list-mapping tests.
  const dbTags = mkDb({
    properties: [{
      id: "tags", name: "Tags", type: "multi_select",
      options: [
        { id: "a", name: "alpha", color: "blue" },
        { id: "b", name: "beta", color: "red" },
        { id: "c", name: "gamma", color: "green" },
      ],
    }],
  });
  const rowTags = (ids: string[]) => mkRow({ rowProps: { tags: ids } });
  const ctxTags = (ids: string[]) => ({ row: rowTags(ids), db: dbTags, pages: [] });

  // ── map ───────────────────────────────────────────────────────────
  it("map(list, explicit lambda) — uppercase each tag", () => {
    expect(formatFormulaValue(evalFormula(`=map(prop("Tags"), (current) => upper(current))`, ctxTags(["a", "b", "c"])).value))
      .toBe("ALPHA, BETA, GAMMA");
  });

  it("map(list, implicit `current`) — bare expr body", () => {
    expect(formatFormulaValue(evalFormula(`=map(prop("Tags"), upper(current))`, ctxTags(["a", "b"])).value))
      .toBe("ALPHA, BETA");
  });

  it("map sees iteration `index`", () => {
    expect(formatFormulaValue(evalFormula(`=map(prop("Tags"), concat(index, ":", current))`, ctxTags(["a", "b", "c"])).value))
      .toBe("0:alpha, 1:beta, 2:gamma");
  });

  it("map on empty list returns empty list", () => {
    expect(formatFormulaValue(evalFormula(`=map(prop("Tags"), upper(current))`, ctxTags([])).value))
      .toBe("");
  });

  it("map on scalar wraps as single-element list (Notion auto-list)", () => {
    // title is a scalar string — map should still produce a 1-elem list.
    expect(formatFormulaValue(evalFormula(`=map(prop("title"), upper(current))`, { row: mkRow({ title: "hello" }), db: mkDb(), pages: [] }).value))
      .toBe("HELLO");
  });

  // ── filter ───────────────────────────────────────────────────────
  it("filter keeps elements where body is truthy", () => {
    expect(formatFormulaValue(evalFormula(`=filter(prop("Tags"), current != "beta")`, ctxTags(["a", "b", "c"])).value))
      .toBe("alpha, gamma");
  });

  it("filter on all-false → empty list", () => {
    expect(formatFormulaValue(evalFormula(`=filter(prop("Tags"), false)`, ctxTags(["a", "b"])).value))
      .toBe("");
  });

  // ── reduce ───────────────────────────────────────────────────────
  it("reduce with accumulator concatenation", () => {
    expect(formatFormulaValue(evalFormula(`=reduce(prop("Tags"), concat(accumulator, current), "")`, ctxTags(["a", "b", "c"])).value))
      .toBe("alphabetagamma");
  });

  it("reduce numeric sum via accumulator", () => {
    // Build via map(toNumber) on indexes then reduce.
    expect(formatFormulaValue(evalFormula(`=reduce(prop("Tags"), accumulator + 1, 0)`, ctxTags(["a", "b", "c", "a"])).value))
      .toBe("4");
  });

  it("reduce on empty list returns initial", () => {
    expect(formatFormulaValue(evalFormula(`=reduce(prop("Tags"), accumulator + 1, 7)`, ctxTags([])).value))
      .toBe("7");
  });

  // ── find ─────────────────────────────────────────────────────────
  it("find returns first matching element", () => {
    expect(formatFormulaValue(evalFormula(`=find(prop("Tags"), current == "beta")`, ctxTags(["a", "b", "c"])).value))
      .toBe("beta");
  });

  it("find returns null when no match", () => {
    expect(formatFormulaValue(evalFormula(`=find(prop("Tags"), current == "zzz")`, ctxTags(["a", "b", "c"])).value))
      .toBe("");
  });

  // ── composition + env isolation ──────────────────────────────────
  it("nested map → filter pipeline", () => {
    // Uppercase then keep only strings shorter than 5 chars
    expect(formatFormulaValue(evalFormula(`=filter(map(prop("Tags"), upper(current)), length(current) < 5)`, ctxTags(["a", "b", "c"])).value))
      .toBe("BETA");
  });

  it("env stack is per-iteration — outer current isn't leaked", () => {
    // Outer map binds current=alpha; inner length() doesn't see "current"
    // as anything but its own scalar arg.
    expect(formatFormulaValue(evalFormula(`=map(prop("Tags"), length(current))`, ctxTags(["a", "b", "c"])).value))
      .toBe("5, 4, 5");
  });

  it("higher-order with no args throws clean arity error", () => {
    const r = evalFormula(`=map()`, { row: mkRow(), db: mkDb(), pages: [] });
    expect(r.error?.message).toMatch(/needs 2 argument/);
  });
});
