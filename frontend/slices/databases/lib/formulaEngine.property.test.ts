import { describe, expect, it } from "vitest";
import type { Database, Page } from "@/shared/types/domain";
import { evalFormula } from "./formula";
import { parseFormula, formatFormulaValue } from "./formulaEngine";

/** Hand-rolled property-based tests (no fast-check dep). A seeded PRNG
 *  drives deterministic randomized cases asserting algebraic invariants
 *  + parser/eval robustness over the formula engine. Seeded so failures
 *  reproduce. */

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ctx = (): Omit<Parameters<typeof evalFormula>[1], never> => ({
  row: {
    id: "r", parentId: null, title: "", icon: "", blocks: [],
    favorite: false, trashed: false, createdAt: 0, updatedAt: 0, rowProps: {},
  } as Page,
  db: {
    id: "d", name: "", icon: "", properties: [], rowIds: [], views: [],
    activeViewId: "", createdAt: 0, updatedAt: 0,
  } as Database,
  pages: [],
});

const ev = (src: string) => formatFormulaValue(evalFormula(src, ctx()).value);
const evNum = (src: string) => parseFloat(ev(src));
const RUNS = 200;

describe("formula property — numeric arithmetic matches JS", () => {
  it("addition / subtraction / multiplication", () => {
    const rng = mulberry32(1);
    for (let i = 0; i < RUNS; i++) {
      const a = Math.floor(rng() * 2000 - 1000);
      const b = Math.floor(rng() * 2000 - 1000);
      expect(evNum(`=${a} + ${b}`)).toBeCloseTo(a + b, 6);
      expect(evNum(`=${a} - ${b}`)).toBeCloseTo(a - b, 6);
      expect(evNum(`=${a} * ${b}`)).toBeCloseTo(a * b, 6);
    }
  });

  it("addition is commutative", () => {
    const rng = mulberry32(2);
    for (let i = 0; i < RUNS; i++) {
      const a = Math.floor(rng() * 1000);
      const b = Math.floor(rng() * 1000);
      expect(ev(`=${a} + ${b}`)).toBe(ev(`=${b} + ${a}`));
    }
  });

  it("identity: a + 0 == a, a * 1 == a", () => {
    const rng = mulberry32(3);
    for (let i = 0; i < RUNS; i++) {
      const a = Math.floor(rng() * 1000 - 500);
      expect(evNum(`=${a} + 0`)).toBe(a);
      expect(evNum(`=${a} * 1`)).toBe(a);
    }
  });
});

describe("formula property — comparison + equality consistency", () => {
  it("(a < b) is the negation of (a >= b)", () => {
    const rng = mulberry32(4);
    for (let i = 0; i < RUNS; i++) {
      const a = Math.floor(rng() * 100);
      const b = Math.floor(rng() * 100);
      const lt = ev(`=${a} < ${b}`);
      const gte = ev(`=${a} >= ${b}`);
      expect(lt).not.toBe(gte); // exactly one is "true"
    }
  });

  it("reflexive: a == a is always true; a != a always false", () => {
    const rng = mulberry32(5);
    for (let i = 0; i < RUNS; i++) {
      const a = Math.floor(rng() * 10000 - 5000);
      expect(ev(`=${a} == ${a}`)).toBe("true");
      expect(ev(`=${a} != ${a}`)).toBe("false");
    }
  });

  it("a <= a always true", () => {
    const rng = mulberry32(6);
    for (let i = 0; i < RUNS; i++) {
      const a = Math.floor(rng() * 1000);
      expect(ev(`=${a} <= ${a}`)).toBe("true");
    }
  });
});

describe("formula property — boolean algebra (De Morgan + absorption)", () => {
  const bools = ["true", "false"];
  it("De Morgan: !(p && q) == (!p || !q)", () => {
    for (const p of bools) for (const q of bools) {
      expect(ev(`=!(${p} && ${q})`)).toBe(ev(`=!${p} || !${q}`));
    }
  });
  it("absorption: p || true == true; p && false == false", () => {
    for (const p of bools) {
      expect(ev(`=${p} || true`)).toBe("true");
      expect(ev(`=${p} && false`)).toBe("false");
    }
  });
  it("double negation: !!p == p", () => {
    for (const p of bools) expect(ev(`=!!${p}`)).toBe(p);
  });
});

describe("formula property — string fn idempotence + length algebra", () => {
  const word = (rng: () => number, n: number) => {
    const alpha = "abcdefghijklmnopqrstuvwxyz";
    let s = "";
    for (let i = 0; i < n; i++) s += alpha[Math.floor(rng() * alpha.length)];
    return s;
  };
  it("upper/lower are idempotent", () => {
    const rng = mulberry32(7);
    for (let i = 0; i < RUNS; i++) {
      const w = word(rng, 1 + Math.floor(rng() * 12));
      expect(ev(`=upper(upper("${w}"))`)).toBe(ev(`=upper("${w}")`));
      expect(ev(`=lower(lower("${w}"))`)).toBe(ev(`=lower("${w}")`));
    }
  });
  it("reverse(reverse(s)) == s", () => {
    const rng = mulberry32(8);
    for (let i = 0; i < RUNS; i++) {
      const w = word(rng, 1 + Math.floor(rng() * 12));
      expect(ev(`=reverse(reverse("${w}"))`)).toBe(w);
    }
  });
  it("length(concat(a,b)) == length(a) + length(b)", () => {
    const rng = mulberry32(9);
    for (let i = 0; i < RUNS; i++) {
      const a = word(rng, Math.floor(rng() * 10));
      const b = word(rng, Math.floor(rng() * 10));
      expect(evNum(`=length(concat("${a}", "${b}"))`)).toBe(a.length + b.length);
    }
  });
});

describe("formula robustness — parser + eval never throw", () => {
  it("parseFormula returns a result object (never throws) for random ASCII", () => {
    const rng = mulberry32(10);
    for (let i = 0; i < RUNS; i++) {
      const len = Math.floor(rng() * 30);
      let s = "";
      for (let j = 0; j < len; j++) s += String.fromCharCode(32 + Math.floor(rng() * 95));
      expect(() => parseFormula(s)).not.toThrow();
      const r = parseFormula(s);
      // either an ast or an error — always one or the other, defined shape
      expect(r.ast !== undefined || r.error !== undefined).toBe(true);
    }
  });

  it("evalFormula never throws + always returns a formatted string", () => {
    const rng = mulberry32(11);
    for (let i = 0; i < RUNS; i++) {
      const len = Math.floor(rng() * 40);
      let s = "=";
      for (let j = 0; j < len; j++) s += String.fromCharCode(32 + Math.floor(rng() * 95));
      expect(() => evalFormula(s, ctx())).not.toThrow();
      expect(typeof ev(s)).toBe("string");
    }
  });

  it("division by zero yields NaN-format, not a throw", () => {
    expect(() => ev("=5 / 0")).not.toThrow();
    expect(ev("=5 / 0")).toBe(""); // NaN formats to empty per coerce
  });
});
