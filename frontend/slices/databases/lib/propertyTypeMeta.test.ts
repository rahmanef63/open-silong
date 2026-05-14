import { describe, expect, it } from "vitest";
import {
  PROPERTY_TYPE_META, PROPERTY_TYPE_LABELS, PROPERTY_TYPE_ICONS,
  PROPERTY_TYPES, defaultPropName,
} from "./propertyTypeMeta";
import type { PropertyType } from "@/shared/types/domain";

const ALL_TYPES: PropertyType[] = [
  "text", "number", "select", "multi_select", "status",
  "date", "person", "checkbox", "url", "email", "phone",
  "files", "relation", "rollup", "formula",
  "created_time", "created_by", "last_edited_time", "last_edited_by",
  "unique_id", "button", "place", "verification",
];

describe("propertyTypeMeta — coverage", () => {
  it("contains every PropertyType variant", () => {
    for (const t of ALL_TYPES) {
      expect(PROPERTY_TYPE_META[t]).toBeDefined();
    }
  });

  it("PROPERTY_TYPES enumerates all keys in declaration order", () => {
    expect(PROPERTY_TYPES.sort()).toEqual([...ALL_TYPES].sort());
  });

  it("derived label/icon maps are consistent with master", () => {
    for (const t of ALL_TYPES) {
      expect(PROPERTY_TYPE_LABELS[t]).toBe(PROPERTY_TYPE_META[t].label);
      expect(PROPERTY_TYPE_ICONS[t]).toBe(PROPERTY_TYPE_META[t].icon);
    }
  });
});

describe("propertyTypeMeta — semantic invariants", () => {
  it("computed types are read-only", () => {
    for (const t of ["rollup", "formula", "created_time", "created_by", "last_edited_time", "last_edited_by", "unique_id"] as PropertyType[]) {
      expect(PROPERTY_TYPE_META[t].readOnlyValue).toBe(true);
    }
  });

  it("editable types are NOT marked read-only", () => {
    for (const t of ["text", "number", "select", "checkbox", "date", "url"] as PropertyType[]) {
      expect(PROPERTY_TYPE_META[t].readOnlyValue).toBeFalsy();
    }
  });

  it("apiName aligns with Notion canonical reference", () => {
    expect(PROPERTY_TYPE_META.text.apiName).toBe("rich_text");
    expect(PROPERTY_TYPE_META.phone.apiName).toBe("phone_number");
    expect(PROPERTY_TYPE_META.person.apiName).toBe("people");
    expect(PROPERTY_TYPE_META.button.apiName).toBe("button");
    expect(PROPERTY_TYPE_META.place.apiName).toBe("place");
    expect(PROPERTY_TYPE_META.verification.apiName).toBe("verification");
  });

  it("category buckets are populated", () => {
    expect(PROPERTY_TYPE_META.number.category).toBe("numeric");
    expect(PROPERTY_TYPE_META.relation.category).toBe("relational");
    expect(PROPERTY_TYPE_META.button.category).toBe("automation");
    expect(PROPERTY_TYPE_META.place.category).toBe("location");
  });

  it("defaultPropName returns a non-empty string for every type", () => {
    for (const t of ALL_TYPES) {
      const name = defaultPropName(t);
      expect(typeof name).toBe("string");
      expect(name.length).toBeGreaterThan(0);
    }
  });
});
