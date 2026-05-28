import { describe, expect, it } from "vitest";
import { parseFormula } from "./parser";
import { collectDeps } from "./deps";

const deps = (src: string) => {
  const { ast } = parseFormula(src);
  return [...collectDeps(ast!)].sort();
};

describe("collectDeps — template + basic expr", () => {
  it("template refs", () => {
    expect(deps("Hi {{Name}}, status {{Status}}")).toEqual(["Name", "Status"]);
  });
  it("math expr refs through binops + calls + unary", () => {
    expect(deps(`=round({{Price}} * 2) + -{{Tax}}`)).toEqual(["Price", "Tax"]);
  });
  it("prop() refs", () => {
    expect(deps(`=prop("Score") + prop("Bonus")`)).toEqual(["Bonus", "Score"]);
  });
  it("no refs → empty", () => {
    expect(deps("=1 + 2 * 3")).toEqual([]);
  });
});

describe("collectDeps — member access (1.C regression)", () => {
  it("member-access object IS a dependency (was dropped before fix)", () => {
    expect(deps(`=prop("Owner").Email`)).toEqual(["Owner"]);
  });
  it("chained member still tracks the root ref", () => {
    expect(deps(`=prop("Owner").Manager.Email`)).toEqual(["Owner"]);
  });
  it("member access in a binop", () => {
    expect(deps(`=prop("A").x + prop("B").y`)).toEqual(["A", "B"]);
  });
});

describe("collectDeps — lambda bodies (1.D regression)", () => {
  it("higher-order arg list is tracked + lambda body refs surface", () => {
    // depends on Tags (the list) AND Other (referenced inside the body)
    expect(deps(`=map(prop("Tags"), prop("Other") + current)`)).toEqual(["Other", "Tags"]);
  });
  it("lambda vars (current/index/accumulator) are NOT deps", () => {
    expect(deps(`=map(prop("Tags"), current)`)).toEqual(["Tags"]);
    expect(deps(`=reduce(prop("Nums"), accumulator + current, 0)`)).toEqual(["Nums"]);
    expect(deps(`=map(prop("Xs"), concat(index, current))`)).toEqual(["Xs"]);
  });
  it("explicit arrow lambda body refs tracked, params excluded", () => {
    expect(deps(`=filter(prop("Tasks"), (current) => current.Status == prop("Filter"))`))
      .toEqual(["Filter", "Tasks"]);
  });
});
