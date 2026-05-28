import { describe, expect, it } from "vitest";
import { parseFormula } from "./parser";
import { inferType } from "./typeCheck";

const typeOf = (src: string) => inferType(parseFormula(src).ast);

describe("typeCheck — inferType (1.E)", () => {
  it("literals infer to their kind", () => {
    expect(typeOf("=42")).toBe("number");
    expect(typeOf(`="hi"`)).toBe("string");
    expect(typeOf("=true")).toBe("boolean");
  });

  it("template mode is always string", () => {
    expect(typeOf("Hello {{Name}}")).toBe("string");
    expect(typeOf("{{Score}}")).toBe("string");
  });

  it("arithmetic → number", () => {
    expect(typeOf("=1 + 2")).toBe("number");
    expect(typeOf("=10 % 3")).toBe("number");
    expect(typeOf("={{Score}} * 2")).toBe("number"); // ref unknown, op pins it
  });

  it("comparison / equality / logical → boolean", () => {
    expect(typeOf("=5 > 3")).toBe("boolean");
    expect(typeOf(`="a" == "b"`)).toBe("boolean");
    expect(typeOf("=true && false")).toBe("boolean");
  });

  it("unary ! → boolean, +/- → number", () => {
    expect(typeOf("=!true")).toBe("boolean");
    expect(typeOf("=-5")).toBe("number");
  });

  it("fn calls use their signature return type", () => {
    expect(typeOf(`=upper("hi")`)).toBe("string");
    expect(typeOf("=round(3.7)")).toBe("number");
    expect(typeOf("=now()")).toBe("date");
    expect(typeOf(`=contains("ab", "a")`)).toBe("boolean");
    expect(typeOf("=count(prop(\"X\"))")).toBe("number");
  });

  it("if() infers common branch type", () => {
    expect(typeOf(`=if(true, "a", "b")`)).toBe("string");
    expect(typeOf("=if(true, 1, 2)")).toBe("number");
    // Mixed branches → any
    expect(typeOf(`=if(true, "a", 2)`)).toBe("any");
  });

  it("ifs() infers common value-branch type (+ default)", () => {
    expect(typeOf(`=ifs(false, "a", true, "b", "c")`)).toBe("string");
    expect(typeOf("=ifs(false, 1, true, 2)")).toBe("number");
    expect(typeOf(`=ifs(false, "a", true, 2)`)).toBe("any");
  });

  it("switch() infers common result-branch type (+ default)", () => {
    expect(typeOf(`=switch(1, 1, "one", 2, "two", "other")`)).toBe("string");
    expect(typeOf("=switch(1, 1, 10, 2, 20)")).toBe("number");
    expect(typeOf(`=switch(1, 1, "one", 2, 20)`)).toBe("any");
  });

  it("refs / member / lambda → any (not statically known)", () => {
    expect(typeOf(`=prop("Owner")`)).toBe("any");
    expect(typeOf(`=prop("Owner").email`)).toBe("any");
  });

  it("nested: comparison driven by arithmetic still boolean", () => {
    expect(typeOf("=(1 + 2) > 2")).toBe("boolean");
  });

  it("null ast → any (parse error)", () => {
    expect(inferType(null)).toBe("any");
  });

  it("empty formula → string (empty template)", () => {
    expect(typeOf("")).toBe("string");
  });
});
