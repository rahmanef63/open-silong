import { describe, expect, it } from "vitest";
import type { Database, Page, Property } from "../types/domain";
import { valueToCell, databaseToCsv } from "./csv";

const prop = (over: Partial<Property> & { id: string; type: Property["type"] }): Property => ({
  name: over.id, ...over,
}) as Property;

const mkRow = (o: Partial<Page>): Page => ({
  id: "r", parentId: null, title: "", icon: "", blocks: [],
  favorite: false, trashed: false, createdAt: 0, updatedAt: 0, rowProps: {},
  ...o,
});

describe("csv valueToCell — scalar types", () => {
  it("null/undefined → empty string", () => {
    expect(valueToCell(prop({ id: "t", type: "text" }), null)).toBe("");
    expect(valueToCell(prop({ id: "t", type: "text" }), undefined as never)).toBe("");
  });

  it("text / url / email / phone → String(value)", () => {
    expect(valueToCell(prop({ id: "t", type: "text" }), "hi")).toBe("hi");
    expect(valueToCell(prop({ id: "u", type: "url" }), "http://x")).toBe("http://x");
    expect(valueToCell(prop({ id: "e", type: "email" }), "a@b.c")).toBe("a@b.c");
    expect(valueToCell(prop({ id: "p", type: "phone" }), "555")).toBe("555");
  });

  it("number — plain / currency / percent", () => {
    expect(valueToCell(prop({ id: "n", type: "number" }), 42)).toBe("42");
    expect(valueToCell(prop({ id: "n", type: "number", numberFormat: "percent" }), 50)).toBe("50%");
    expect(valueToCell(prop({ id: "n", type: "number", numberFormat: "currency", numberCurrencyCode: "$" }), 9)).toBe("$9");
    // non-number value → empty
    expect(valueToCell(prop({ id: "n", type: "number" }), "x" as never)).toBe("");
  });

  it("checkbox → Yes/No (false → No, since false != null)", () => {
    expect(valueToCell(prop({ id: "c", type: "checkbox" }), true)).toBe("Yes");
    expect(valueToCell(prop({ id: "c", type: "checkbox" }), false)).toBe("No");
  });
});

describe("csv valueToCell — option types", () => {
  const p = prop({
    id: "s", type: "select",
    options: [{ id: "a", name: "Alpha", color: "blue" }, { id: "b", name: "Beta", color: "red" }],
  });
  it("select resolves option id → name", () => {
    expect(valueToCell(p, "a")).toBe("Alpha");
    expect(valueToCell(p, "missing")).toBe("");
  });
  it("multi_select joins names, drops unknown ids", () => {
    const mp = prop({ id: "m", type: "multi_select", options: p.options });
    expect(valueToCell(mp, ["a", "b"])).toBe("Alpha, Beta");
    expect(valueToCell(mp, ["a", "zzz"])).toBe("Alpha");
    expect(valueToCell(mp, "notarray" as never)).toBe("");
  });
});

describe("csv valueToCell — date", () => {
  const d = prop({ id: "d", type: "date" });
  it("single date → MM/DD/YYYY", () => {
    expect(valueToCell(d, { date: "2026-05-28" })).toBe("05/28/2026");
  });
  it("date range → MM/DD/YYYY - MM/DD/YYYY", () => {
    expect(valueToCell(d, { date: "2026-01-02", end: "2026-03-04" } as never)).toBe("01/02/2026 - 03/04/2026");
  });
  it("missing date → empty", () => {
    expect(valueToCell(d, {} as never)).toBe("");
  });
});

describe("csv valueToCell — relation/person/files", () => {
  it("relation resolves to titles when allPages supplied, else ids", () => {
    const r = prop({ id: "rel", type: "relation" });
    const pages = [mkRow({ id: "p1", title: "Page One" }), mkRow({ id: "p2", title: "Page Two" })];
    expect(valueToCell(r, ["p1", "p2"], pages)).toBe("Page One, Page Two");
    expect(valueToCell(r, ["p1", "p2"])).toBe("p1, p2");
    // unknown id falls back to the id string
    expect(valueToCell(r, ["pX"], pages)).toBe("pX");
  });
  it("person joins ids", () => {
    expect(valueToCell(prop({ id: "pe", type: "person" }), ["u1", "u2"])).toBe("u1, u2");
  });
  it("files — string entries + {url} objects", () => {
    const f = prop({ id: "f", type: "files" });
    expect(valueToCell(f, ["a.png", "b.png"])).toBe("a.png, b.png");
    expect(valueToCell(f, [{ url: "x.pdf" } as never])).toBe("x.pdf");
  });
});

describe("csv valueToCell — computed/interactive → empty", () => {
  for (const t of ["formula", "rollup", "button", "verification"] as const) {
    it(`${t} → empty (Notion recomputes)`, () => {
      expect(valueToCell(prop({ id: t, type: t }), "anything" as never)).toBe("");
    });
  }
  it("created_time number → non-empty locale string", () => {
    const out = valueToCell(prop({ id: "ct", type: "created_time" }), 1_700_000_000_000);
    expect(out.length).toBeGreaterThan(0);
  });
});

describe("csv databaseToCsv — structure + RFC-4180", () => {
  const db: Database = {
    id: "db", name: "T", icon: "📁",
    properties: [
      prop({ id: "status", name: "Status", type: "select",
        options: [{ id: "done", name: "Done", color: "green" }] }),
      prop({ id: "note", name: "Note", type: "text" }),
    ],
    rowIds: [], views: [], activeViewId: "", createdAt: 0, updatedAt: 0,
  };

  it("starts with UTF-8 BOM + Title header + prop names", () => {
    const csv = databaseToCsv(db, []);
    expect(csv.startsWith("﻿")).toBe(true);
    const firstLine = csv.replace("﻿", "").split("\r\n")[0];
    expect(firstLine).toBe("Title,Status,Note");
  });

  it("emits CRLF row delimiter + cells in property order", () => {
    const rows = [mkRow({ id: "r1", title: "Row 1", rowProps: { status: "done", note: "hello" } })];
    const csv = databaseToCsv(db, rows).replace("﻿", "");
    const lines = csv.split("\r\n");
    expect(lines[1]).toBe("Row 1,Done,hello");
  });

  it("RFC-4180 quotes cells with comma / quote / newline", () => {
    const rows = [mkRow({ id: "r", title: 'has "quote", comma', rowProps: { note: "line1\nline2" } })];
    const csv = databaseToCsv(db, rows).replace("﻿", "");
    const body = csv.split("\r\n")[1];
    // title: doubled quotes + wrapped; note: wrapped for newline
    expect(body).toContain('"has ""quote"", comma"');
    expect(body).toContain('"line1\nline2"');
  });

  it("filters trashed rows", () => {
    const rows = [
      mkRow({ id: "keep", title: "Keep" }),
      mkRow({ id: "gone", title: "Gone", trashed: true }),
    ];
    const csv = databaseToCsv(db, rows).replace("﻿", "");
    expect(csv).toContain("Keep");
    expect(csv).not.toContain("Gone");
  });
});
