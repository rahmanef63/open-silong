import { describe, expect, it } from "vitest";
import { summarizeTemplate, walkTemplateTree, templateStats } from "./previewTemplate";

const sample = {
  page: {
    icon: "🏠",
    title: "Root",
    blocks: [
      { type: "paragraph", text: "hello world this is a fairly long line of body text that exceeds forty chars" },
      { type: "database", databaseRef: "db1" },
    ],
    databases: [
      { name: "Tasks", properties: [{}, {}, {}], seedRows: [{}, {}] },
    ],
    children: [
      { title: "Child", blocks: [{ type: "h1", text: "Sub" }], databases: [], children: [] },
    ],
  },
};

describe("summarizeTemplate", () => {
  it("flags missing root page", () => {
    expect(summarizeTemplate({})).toEqual({ lines: ["(no root page)"], ok: false });
    expect(summarizeTemplate(null)).toEqual({ lines: ["(no root page)"], ok: false });
  });

  it("summarizes pages, blocks, databases, nested children", () => {
    const { lines, ok } = summarizeTemplate(sample);
    expect(ok).toBe(true);
    expect(lines[0]).toBe("🏠 Root");
    // database block line
    expect(lines.some((l) => l.includes("[database] → db1"))).toBe(true);
    // embedded db summary
    expect(lines.some((l) => l.includes("📊 Tasks (3 props, 2 rows)"))).toBe(true);
    // nested child page is indented
    expect(lines.some((l) => l.startsWith("  ") && l.includes("Child"))).toBe(true);
  });

  it("truncates block text to 40 chars", () => {
    const { lines } = summarizeTemplate(sample);
    const para = lines.find((l) => l.includes("paragraph"))!;
    // 40-char slice inside quotes
    const quoted = para.match(/"([^"]*)"/)![1];
    expect(quoted.length).toBe(40);
  });

  it("falls back to defaults for missing icon/title", () => {
    const { lines } = summarizeTemplate({ page: { blocks: [] } });
    expect(lines[0]).toBe("📄 (no title)");
  });
});

describe("walkTemplateTree", () => {
  it("returns null when no root page", () => {
    expect(walkTemplateTree({})).toBeNull();
    expect(walkTemplateTree(undefined)).toBeNull();
  });

  it("builds a page node with block/database/child children", () => {
    const root = walkTemplateTree(sample)!;
    expect(root.kind).toBe("page");
    expect(root.icon).toBe("🏠");
    expect(root.label).toBe("Root");
    const kinds = root.children!.map((c) => c.kind);
    // 1 block + 1 database-block + 1 embedded-db + 1 child page
    expect(kinds).toEqual(["block", "database", "database", "page"]);
  });

  it("truncates block detail text to 60 chars", () => {
    const root = walkTemplateTree(sample)!;
    const blockNode = root.children!.find((c) => c.kind === "block")!;
    expect(blockNode.detail!.replace(/"/g, "").length).toBe(60);
  });

  it("embedded db node carries props/rows detail", () => {
    const root = walkTemplateTree(sample)!;
    const dbNode = root.children!.find((c) => c.kind === "database" && c.label === "Tasks")!;
    expect(dbNode.detail).toBe("3 props · 2 rows");
  });
});

describe("templateStats", () => {
  it("zero accumulator when no root page", () => {
    expect(templateStats({})).toEqual({ pages: 0, blocks: 0, databases: 0, seedRows: 0, blockTypes: {} });
  });

  it("counts across the nested tree", () => {
    const s = templateStats(sample);
    expect(s.pages).toBe(2);       // root + child
    expect(s.blocks).toBe(3);      // paragraph + database-block + h1
    // database counted from BOTH the database block AND the embedded db
    expect(s.databases).toBe(2);
    expect(s.seedRows).toBe(2);
    expect(s.blockTypes).toEqual({ paragraph: 1, database: 1, h1: 1 });
  });

  it("unknown block type bucketed as 'unknown'", () => {
    const s = templateStats({ page: { blocks: [{}], databases: [], children: [] } });
    expect(s.blockTypes).toEqual({ unknown: 1 });
  });
});
