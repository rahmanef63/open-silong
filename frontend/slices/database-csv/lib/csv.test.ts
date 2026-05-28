import { describe, expect, it } from "vitest";
import type { Page, Property } from "@/shared/types/domain";
import { parseCsv, valueFromString } from "./csv";

const P = (o: Record<string, unknown>): Property => o as unknown as Property;
const pg = (o: Record<string, unknown>): Page => o as unknown as Page;

describe("parseCsv", () => {
  it("splits a simple grid into headers + rows", () => {
    expect(parseCsv("a,b,c\n1,2,3")).toEqual({
      headers: ["a", "b", "c"],
      rows: [["1", "2", "3"]],
    });
  });

  it("keeps commas inside quoted fields", () => {
    expect(parseCsv('name,note\n"Smith, John",hi')).toEqual({
      headers: ["name", "note"],
      rows: [["Smith, John", "hi"]],
    });
  });

  it("unescapes doubled quotes", () => {
    expect(parseCsv('q\n"she said ""hi"""')).toEqual({
      headers: ["q"],
      rows: [['she said "hi"']],
    });
  });

  it("keeps newlines inside quoted fields", () => {
    expect(parseCsv('a,b\n"line1\nline2",x')).toEqual({
      headers: ["a", "b"],
      rows: [["line1\nline2", "x"]],
    });
  });

  it("handles CRLF and bare CR line endings", () => {
    expect(parseCsv("a,b\r\n1,2\r3,4")).toEqual({
      headers: ["a", "b"],
      rows: [["1", "2"], ["3", "4"]],
    });
  });

  it("does not emit a trailing empty row for a final newline", () => {
    expect(parseCsv("a\n1\n")).toEqual({ headers: ["a"], rows: [["1"]] });
    expect(parseCsv("a\n1")).toEqual({ headers: ["a"], rows: [["1"]] });
  });

  it("strips a leading UTF-8 BOM from the first header", () => {
    expect(parseCsv("﻿id,name\n1,x").headers).toEqual(["id", "name"]);
  });

  it("returns empty headers/rows for empty input", () => {
    expect(parseCsv("")).toEqual({ headers: [], rows: [] });
  });
});

describe("valueFromString", () => {
  it("returns null for blank input and computed/system types", () => {
    expect(valueFromString("   ", P({ type: "text" }))).toBeNull();
    expect(valueFromString("anything", P({ type: "formula" }))).toBeNull();
    expect(valueFromString("anything", P({ type: "rollup" }))).toBeNull();
    expect(valueFromString("anything", P({ type: "created_time" }))).toBeNull();
  });

  it("coerces checkbox truthy tokens case-insensitively", () => {
    for (const t of ["true", "YES", "1", "x", "✓"]) {
      expect(valueFromString(t, P({ type: "checkbox" }))).toBe(true);
    }
    for (const f of ["false", "no", "0", "maybe"]) {
      expect(valueFromString(f, P({ type: "checkbox" }))).toBe(false);
    }
  });

  it("coerces numbers, rejecting non-finite", () => {
    expect(valueFromString(" 42 ", P({ type: "number" }))).toBe(42);
    expect(valueFromString("3.14", P({ type: "number" }))).toBe(3.14);
    expect(valueFromString("abc", P({ type: "number" }))).toBeNull();
  });

  it("normalizes dates: ISO passthrough, US MM/DD/YYYY → ISO, else raw", () => {
    expect(valueFromString("2026-05-13", P({ type: "date" }))).toEqual({ date: "2026-05-13" });
    expect(valueFromString("5/13/2026", P({ type: "date" }))).toEqual({ date: "2026-05-13" });
    expect(valueFromString("May 13", P({ type: "date" }))).toEqual({ date: "May 13" });
  });

  it("resolves select/status option names to ids (case-insensitive)", () => {
    const prop = P({ type: "select", options: [{ id: "s1", name: "Todo" }, { id: "s2", name: "Done" }] });
    expect(valueFromString("todo", prop)).toBe("s1");
    expect(valueFromString("DONE", prop)).toBe("s2");
    expect(valueFromString("missing", prop)).toBeNull();
  });

  it("splits multi_select on , or ; and drops unknown options", () => {
    const prop = P({ type: "multi_select", options: [{ id: "a", name: "Red" }, { id: "b", name: "Blue" }] });
    expect(valueFromString("Red, Blue", prop)).toEqual(["a", "b"]);
    expect(valueFromString("red;green", prop)).toEqual(["a"]);
  });

  it("resolves relation values by title (within scope) or by id", () => {
    const pages = [
      pg({ id: "p1", title: "Alpha", rowOfDatabaseId: "db1" }),
      pg({ id: "p2", title: "Beta", rowOfDatabaseId: "db2" }),
      pg({ id: "p3", title: "Gamma", rowOfDatabaseId: "db1", trashed: true }),
    ];
    const prop = P({ type: "relation", relationDatabaseId: "db1" });
    expect(valueFromString("Alpha", prop, { pages })).toEqual(["p1"]);
    expect(valueFromString("Beta", prop, { pages })).toEqual([]); // out of db1 scope
    expect(valueFromString("p1", prop, { pages })).toEqual(["p1"]); // id fallback
    expect(valueFromString("Gamma", prop, { pages })).toEqual([]); // trashed excluded
  });

  it("returns null for person/files and trims plain text-like types", () => {
    expect(valueFromString("anyone", P({ type: "person" }))).toBeNull();
    expect(valueFromString("file.png", P({ type: "files" }))).toBeNull();
    expect(valueFromString("  hello  ", P({ type: "text" }))).toBe("hello");
    expect(valueFromString(" a@b.co ", P({ type: "email" }))).toBe("a@b.co");
  });
});
