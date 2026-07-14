import { describe, it, expect } from "vitest";
import {
  inlineMdToRichText, richTextToInlineMd,
  blockToNotion, blockFromNotion,
  propertyToNotionSchema,
  propertiesArrayToMap,
  valueToNotion, valueFromNotion,
} from "./notionShape";

describe("inlineMdToRichText", () => {
  it("plain text → single segment", () => {
    const out = inlineMdToRichText("hello");
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ type: "text", plain_text: "hello", annotations: { bold: false } });
  });
  it("bold → annotation set", () => {
    const out = inlineMdToRichText("**hi**");
    expect(out).toHaveLength(1);
    expect(out[0].annotations.bold).toBe(true);
    expect(out[0].plain_text).toBe("hi");
  });
  it("italic + strike + code", () => {
    const it = inlineMdToRichText("_x_");
    const st = inlineMdToRichText("~~y~~");
    const cd = inlineMdToRichText("`z`");
    expect(it[0].annotations.italic).toBe(true);
    expect(st[0].annotations.strikethrough).toBe(true);
    expect(cd[0].annotations.code).toBe(true);
  });
  it("link → text segment with link", () => {
    const out = inlineMdToRichText("[X](/p/abc)");
    expect(out[0].text!.link!.url).toBe("/p/abc");
    expect(out[0].href).toBe("/p/abc");
  });
  it("inline math → equation segment", () => {
    const out = inlineMdToRichText("$E=mc^2$");
    expect(out[0].type).toBe("equation");
    expect(out[0].equation!.expression).toBe("E=mc^2");
  });
  it("mixed segments preserve order", () => {
    const out = inlineMdToRichText("a **b** c");
    expect(out.map((s) => s.plain_text)).toEqual(["a ", "b", " c"]);
  });
});

describe("richTextToInlineMd round-trip", () => {
  const cases = ["hello", "**bold**", "_italic_", "~~strike~~", "`code`", "[lab](/p/x)", "$x+y$"];
  for (const src of cases) {
    it(`round-trips ${JSON.stringify(src)}`, () => {
      const back = richTextToInlineMd(inlineMdToRichText(src));
      expect(back).toBe(src);
    });
  }
  it("undefined → empty string", () => expect(richTextToInlineMd(undefined)).toBe(""));
});

describe("blockToNotion / blockFromNotion", () => {
  it("paragraph round-trips text", () => {
    const out = blockToNotion({ id: "b1", type: "paragraph", text: "**hi**" });
    expect(out.type).toBe("paragraph");
    expect((out.paragraph as any).rich_text[0].annotations.bold).toBe(true);
    const back = blockFromNotion(out);
    expect(back.type).toBe("paragraph");
    expect(back.text).toBe("**hi**");
  });
  it("h2 maps to heading_2", () => {
    expect(blockToNotion({ id: "h", type: "h2", text: "T" }).type).toBe("heading_2");
    expect(blockFromNotion({ object: "block", type: "heading_2", heading_2: { rich_text: [{ type: "text", text: { content: "T" }, annotations: { bold:false,italic:false,strikethrough:false,underline:false,code:false,color:"default" }, plain_text: "T", href: null }] } as any }).type).toBe("h2");
  });
  it("todo carries `checked`", () => {
    const out = blockToNotion({ id: "t", type: "todo", text: "buy", checked: true });
    expect(out.type).toBe("to_do");
    expect((out.to_do as any).checked).toBe(true);
    expect(blockFromNotion(out).checked).toBe(true);
  });
  it("code carries language", () => {
    const out = blockToNotion({ id: "c", type: "code", text: "x", lang: "python" });
    expect((out.code as any).language).toBe("python");
    expect(blockFromNotion(out).lang).toBe("python");
  });
  it("divider has empty payload", () => {
    expect(blockToNotion({ id: "d", type: "divider" }).divider).toEqual({});
  });
  it("child_page uses title field", () => {
    const out = blockToNotion({ id: "p", type: "page", text: "Sub" });
    expect((out.child_page as any).title).toBe("Sub");
    expect(blockFromNotion(out).text).toBe("Sub");
  });
  it("columns2 → column_list with 2 column children", () => {
    const out = blockToNotion({
      id: "c2", type: "columns2",
      columns: [[{ id: "a", type: "paragraph", text: "L" }], [{ id: "b", type: "paragraph", text: "R" }]],
    });
    expect(out.type).toBe("column_list");
    expect((out.column_list as any).children).toHaveLength(2);
    expect((out.column_list as any).children[0].type).toBe("column");
  });
  it("table emits table_row children with rich_text cells", () => {
    const out = blockToNotion({
      id: "tb", type: "table",
      tableRows: [["A", "B"], ["C", "D"]],
      tableHeader: true,
    });
    expect(out.type).toBe("table");
    expect((out.table as any).table_width).toBe(2);
    expect((out.table as any).has_column_header).toBe(true);
    expect((out.table as any).children[0].table_row.cells).toHaveLength(2);
  });
  it("equation block carries expression", () => {
    const out = blockToNotion({ id: "eq", type: "equation", text: "E=mc^2" });
    expect((out.equation as any).expression).toBe("E=mc^2");
    expect(blockFromNotion(out).text).toBe("E=mc^2");
  });
  it("foreign type collapses to paragraph", () => {
    const out = blockFromNotion({ object: "block", type: "synced_block", synced_block: {} as any });
    expect(out.type).toBe("paragraph");
  });
});

describe("propertyToNotionSchema", () => {
  it("text → rich_text with empty payload", () => {
    const e = propertyToNotionSchema({ id: "p1", name: "Title", type: "text" });
    expect(e.type).toBe("rich_text");
    expect(e.rich_text).toEqual({});
  });
  it("number with currency emits dollar/euro/etc", () => {
    const e = propertyToNotionSchema({ id: "p2", name: "Price", type: "number", numberFormat: "currency", numberCurrencyCode: "EUR" });
    expect((e.number as any).format).toBe("euro");
  });
  it("select carries options[]", () => {
    const e = propertyToNotionSchema({ id: "p3", name: "Stage", type: "select", options: [{ id: "o1", name: "A", color: "red" }] });
    expect((e.select as any).options).toHaveLength(1);
  });
  it("relation single vs dual", () => {
    const single = propertyToNotionSchema({ id: "r1", name: "R", type: "relation", relationDatabaseId: "db_x" });
    const dual = propertyToNotionSchema({ id: "r2", name: "R2", type: "relation", relationDatabaseId: "db_y", relationTwoWay: true, relationInversePropertyId: "inv1" });
    expect((single.relation as any).type).toBe("single_property");
    expect((dual.relation as any).type).toBe("dual_property");
    expect((dual.relation as any).dual_property.synced_property_id).toBe("inv1");
  });
  it("formula carries expression", () => {
    const e = propertyToNotionSchema({ id: "f", name: "F", type: "formula", formulaExpression: "1+1" });
    expect((e.formula as any).expression).toBe("1+1");
  });
});

describe("propertiesArrayToMap", () => {
  it("array → map keyed by name, preserves config", () => {
    const arr = [
      { id: "p1", name: "Title", type: "text" },
      { id: "p2", name: "Tags", type: "multi_select", options: [{ id: "o", name: "X", color: "red" }] },
    ];
    const map = propertiesArrayToMap(arr);
    expect(Object.keys(map)).toEqual(["Title", "Tags"]);
    expect(map.Tags.type).toBe("multi_select");
  });
});

describe("valueToNotion / valueFromNotion", () => {
  it("checkbox round-trip", () => {
    const p = { id: "c", name: "Done", type: "checkbox" };
    const nv = valueToNotion(true, p);
    expect(nv.checkbox).toBe(true);
    expect(valueFromNotion(nv, p)).toBe(true);
  });
  it("number round-trip", () => {
    const p = { id: "n", name: "X", type: "number" };
    expect(valueFromNotion(valueToNotion(42, p), p)).toBe(42);
  });
  it("select returns option id", () => {
    const p = { id: "s", name: "S", type: "select", options: [{ id: "o1", name: "A", color: "red" }] };
    const nv = valueToNotion("o1", p);
    expect((nv.select as any).id).toBe("o1");
    expect(valueFromNotion(nv, p)).toBe("o1");
  });
  it("multi_select preserves ids", () => {
    const p = { id: "ms", name: "M", type: "multi_select", options: [{ id: "a", name: "A", color: "red" }, { id: "b", name: "B", color: "blue" }] };
    const nv = valueToNotion(["a", "b"], p);
    expect((nv.multi_select as any[]).map((o: any) => o.id)).toEqual(["a", "b"]);
    expect(valueFromNotion(nv, p)).toEqual(["a", "b"]);
  });
  it("date envelope", () => {
    const p = { id: "d", name: "D", type: "date" };
    const nv = valueToNotion({ date: "2026-05-09" }, p);
    expect((nv.date as any).start).toBe("2026-05-09");
    expect((valueFromNotion(nv, p) as any).date).toBe("2026-05-09");
  });
  it("relation envelope", () => {
    const p = { id: "r", name: "R", type: "relation" };
    const nv = valueToNotion(["pg1", "pg2"], p);
    expect((nv.relation as any[]).map((x: any) => x.id)).toEqual(["pg1", "pg2"]);
    expect(valueFromNotion(nv, p)).toEqual(["pg1", "pg2"]);
  });
  it("rich_text round-trip preserves markers", () => {
    const p = { id: "rt", name: "Body", type: "text" };
    const nv = valueToNotion("**bold**", p);
    expect(valueFromNotion(nv, p)).toBe("**bold**");
  });
  it("url round-trip", () => {
    const p = { id: "u", name: "U", type: "url" };
    expect(valueFromNotion(valueToNotion("https://x.com", p), p)).toBe("https://x.com");
  });
});
