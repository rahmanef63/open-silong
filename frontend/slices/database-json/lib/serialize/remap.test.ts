import { describe, expect, it } from "vitest";
import type {
  DatabaseViewConfig, Property, PropertyValue,
} from "@/shared/types/domain";
import type { RemapTables } from "./types";
import {
  buildPropAndOptionRemap,
  remapPropertyRefs,
  remapRowProps,
  remapViews,
} from "./remap";

// Test factories — the remap functions only touch a handful of fields, so
// minimal literals cast to the domain type keep the cases readable.
const P = (o: Record<string, unknown>): Property => o as unknown as Property;
const V = (o: Record<string, unknown>): DatabaseViewConfig => o as unknown as DatabaseViewConfig;
const tables = (over: Partial<RemapTables> = {}): RemapTables => ({
  props: new Map(), options: new Map(), views: new Map(),
  templates: new Map(), rows: new Map(), ...over,
});

describe("buildPropAndOptionRemap", () => {
  it("assigns fresh ids and records old→new in remap.props", () => {
    const props = [P({ id: "old1", type: "text" }), P({ id: "old2", type: "select", options: [] })];
    const { remap, properties } = buildPropAndOptionRemap(props);

    expect(properties).toHaveLength(2);
    expect(properties[0].id).not.toBe("old1");
    expect(remap.props.get("old1")).toBe(properties[0].id);
    expect(remap.props.get("old2")).toBe(properties[1].id);
  });

  it("remaps option ids deterministically as `${newId}_opt_${i}` and preserves names", () => {
    const props = [P({ id: "p", type: "select", options: [
      { id: "oa", name: "Alpha", color: "red" },
      { id: "ob", name: "Beta" },
    ] })];
    const { remap, properties } = buildPropAndOptionRemap(props);
    const newId = properties[0].id;

    expect(properties[0].options?.[0].id).toBe(`${newId}_opt_0`);
    expect(properties[0].options?.[1].id).toBe(`${newId}_opt_1`);
    expect(properties[0].options?.[0].name).toBe("Alpha");
    expect(properties[0].options?.[0].color).toBe("red");
    expect(remap.options.get("oa")).toBe(`${newId}_opt_0`);
    expect(remap.options.get("ob")).toBe(`${newId}_opt_1`);
  });

  it("leaves options undefined when the property had none, and does not mutate input", () => {
    const props = [P({ id: "old1", type: "text" })];
    const { properties } = buildPropAndOptionRemap(props);
    expect(properties[0].options).toBeUndefined();
    expect(props[0].id).toBe("old1"); // original untouched
  });
});

describe("remapPropertyRefs", () => {
  it("rewrites rollup relation/target ids through remap.props", () => {
    const remap = tables({ props: new Map([["oldRel", "newRel"], ["oldTgt", "newTgt"]]) });
    const [out] = remapPropertyRefs(
      [P({ id: "x", type: "rollup", rollupRelationPropertyId: "oldRel", rollupTargetPropertyId: "oldTgt" })],
      remap,
    );
    expect(out.rollupRelationPropertyId).toBe("newRel");
    expect(out.rollupTargetPropertyId).toBe("newTgt");
  });

  it("falls back to the original id when not in the remap, and leaves undefined refs alone", () => {
    const remap = tables({ props: new Map([["known", "KNOWN"]]) });
    const [out] = remapPropertyRefs(
      [P({ id: "y", type: "rollup", rollupRelationPropertyId: "unmapped" })],
      remap,
    );
    expect(out.rollupRelationPropertyId).toBe("unmapped");
    expect(out.rollupTargetPropertyId).toBeUndefined();
  });
});

describe("remapViews", () => {
  it("assigns a new view id, records it, and remaps every property reference", () => {
    const remap = tables({ props: new Map([["a", "A"], ["b", "B"], ["c", "C"]]) });
    const view = V({
      id: "v1",
      type: "table",
      groupBy: "a",
      sorts: [{ propertyId: "b", direction: "asc" }],
      filters: [{ propertyId: "c", op: "eq", value: 1 }],
      hiddenPropIds: ["a", "unknownProp"],
      calendarDateProp: "b",
    });
    const [out] = remapViews([view], remap);

    expect(out.id).not.toBe("v1");
    expect(remap.views.get("v1")).toBe(out.id);
    expect(out.groupBy).toBe("A");
    expect(out.sorts?.[0].propertyId).toBe("B");
    expect(out.filters?.[0].propertyId).toBe("C");
    expect(out.hiddenPropIds).toEqual(["A", "unknownProp"]); // unknown falls back
    expect(out.calendarDateProp).toBe("B");
  });

  it("tolerates missing optional arrays/fields", () => {
    const remap = tables({ props: new Map() });
    const [out] = remapViews([V({ id: "v", type: "table" })], remap);
    expect(out.sorts).toEqual([]);
    expect(out.filters).toEqual([]);
    expect(out.groupBy).toBeUndefined();
  });
});

describe("remapRowProps", () => {
  const remap = tables({
    props: new Map([["ps", "PS"], ["pst", "PST"], ["pm", "PM"], ["pr", "PR"], ["pt", "PT"]]),
    options: new Map([["o1", "O1"], ["o2", "O2"]]),
    rows: new Map([["r1", "R1"]]),
  });
  const propsByOldId = new Map<string, Property>([
    ["ps", P({ id: "ps", type: "select" })],
    ["pst", P({ id: "pst", type: "status" })],
    ["pm", P({ id: "pm", type: "multi_select" })],
    ["pr", P({ id: "pr", type: "relation" })],
    ["pt", P({ id: "pt", type: "text" })],
  ]);
  const cast = (o: Record<string, unknown>) => o as unknown as Record<string, PropertyValue>;

  it("remaps keys + select/status options + multi_select + relation rows; passes through scalars", () => {
    const out = remapRowProps(cast({
      ps: "o1",
      pst: "o2",
      pm: ["o1", "o2", "unknownOpt"],
      pr: ["r1", "r2"],
      pt: "hello",
      ghost: "x", // not in remap.props → dropped
    }), remap, propsByOldId);

    expect(out).toEqual({
      PS: "O1",
      PST: "O2",
      PM: ["O1", "O2", "unknownOpt"], // unknown option falls back
      PR: ["R1", "r2"], // unknown row falls back
      PT: "hello",
    });
    expect(out).not.toHaveProperty("ghost");
  });

  it("passes the raw value through when the prop is mapped but its schema is unknown", () => {
    const r = tables({ props: new Map([["pp", "PP"]]) });
    expect(remapRowProps(cast({ pp: "raw" }), r, new Map())).toEqual({ PP: "raw" });
  });

  it("does not touch select/multi_select values of the wrong runtime shape", () => {
    expect(remapRowProps(cast({ ps: 123 }), remap, propsByOldId)).toEqual({ PS: 123 });
    expect(remapRowProps(cast({ pm: "not-an-array" }), remap, propsByOldId)).toEqual({ PM: "not-an-array" });
  });

  it("returns an empty object for undefined rowProps", () => {
    expect(remapRowProps(undefined, remap, propsByOldId)).toEqual({});
  });
});
