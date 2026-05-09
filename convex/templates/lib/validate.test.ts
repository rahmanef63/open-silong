import { describe, it, expect } from "vitest";
import { validateTemplate } from "./validate";

const baseValid = {
  version: 1,
  name: "T",
  icon: "🌱",
  category: "Test",
  page: {
    ref: "root",
    title: "Hello",
    icon: "🌱",
    blocks: [{ type: "paragraph", text: "" }],
  },
};

describe("validateTemplate — base shape", () => {
  it("accepts a minimal valid template", () => {
    expect(() => validateTemplate(baseValid)).not.toThrow();
  });
  it("rejects wrong version", () => {
    expect(() => validateTemplate({ ...baseValid, version: 2 })).toThrow(/invalid/i);
  });
  it("rejects missing icon", () => {
    expect(() => validateTemplate({ ...baseValid, icon: "" })).toThrow(/invalid/i);
  });
});

describe("validateTemplate — columns", () => {
  it("accepts columns2 with 2 sub-arrays", () => {
    expect(() => validateTemplate({
      ...baseValid,
      page: { ...baseValid.page, blocks: [
        { type: "columns2", columns: [
          [{ type: "paragraph", text: "L" }],
          [{ type: "paragraph", text: "R" }],
        ] },
      ] },
    })).not.toThrow();
  });
  it("rejects columns2 w/ 3 sub-arrays", () => {
    expect(() => validateTemplate({
      ...baseValid,
      page: { ...baseValid.page, blocks: [
        { type: "columns2", columns: [[], [], []] },
      ] },
    })).toThrow(/columns2 must have exactly 2/);
  });
  it("accepts columns3 with 3 sub-arrays", () => {
    expect(() => validateTemplate({
      ...baseValid,
      page: { ...baseValid.page, blocks: [
        { type: "columns3", columns: [[], [], []] },
      ] },
    })).not.toThrow();
  });
  it("validates nested database refs inside columns", () => {
    expect(() => validateTemplate({
      ...baseValid,
      page: { ...baseValid.page, blocks: [
        { type: "columns2", columns: [
          [{ type: "database", databaseRef: "missing" }],
          [{ type: "paragraph", text: "" }],
        ] },
      ] },
    })).toThrow(/unknown databaseRef/);
  });
  it("walks nested toggle children for db ref check", () => {
    expect(() => validateTemplate({
      ...baseValid,
      page: { ...baseValid.page, blocks: [
        { type: "toggle", text: "more", children: [
          { type: "database", databaseRef: "ghost" },
        ] },
      ] },
    })).toThrow(/unknown databaseRef/);
  });
});

describe("validateTemplate — view types + property types", () => {
  function withDb(views: any[]) {
    return {
      ...baseValid,
      page: {
        ...baseValid.page,
        databases: [{
          ref: "db1", name: "DB", icon: "📋",
          properties: [{ id: "n", name: "N", type: "text" }],
          views,
        }],
      },
    };
  }
  it("accepts dashboard, chart, feed, map, form views", () => {
    expect(() => validateTemplate(withDb([
      { id: "v1", type: "dashboard", name: "D" },
      { id: "v2", type: "chart", name: "C" },
      { id: "v3", type: "feed", name: "F" },
      { id: "v4", type: "map", name: "M" },
      { id: "v5", type: "form", name: "Fo" },
    ]))).not.toThrow();
  });
  it("rejects unknown view type", () => {
    expect(() => validateTemplate(withDb([{ id: "v", type: "unknown", name: "X" }]))).toThrow(/invalid/i);
  });
  it("accepts button + place property types", () => {
    expect(() => validateTemplate({
      ...baseValid,
      page: {
        ...baseValid.page,
        databases: [{
          ref: "db", name: "D", icon: "📋",
          properties: [
            { id: "btn", name: "Run", type: "button" },
            { id: "loc", name: "Location", type: "place" },
          ],
        }],
      },
    })).not.toThrow();
  });
});

describe("validateTemplate — relation refs", () => {
  it("accepts valid relationDatabaseRef", () => {
    expect(() => validateTemplate({
      ...baseValid,
      page: {
        ...baseValid.page,
        databases: [
          { ref: "a", name: "A", icon: "📋", properties: [{ id: "n", name: "N", type: "text" }] },
          { ref: "b", name: "B", icon: "📋", properties: [
            { id: "n", name: "N", type: "text" },
            { id: "rel", name: "R", type: "relation", relationDatabaseRef: "a" },
          ] },
        ],
      },
    })).not.toThrow();
  });
  it("rejects unknown relationDatabaseRef", () => {
    expect(() => validateTemplate({
      ...baseValid,
      page: {
        ...baseValid.page,
        databases: [{
          ref: "a", name: "A", icon: "📋",
          properties: [{ id: "rel", name: "R", type: "relation", relationDatabaseRef: "ghost" }],
        }],
      },
    })).toThrow(/unknown relationDatabaseRef "ghost"/);
  });
});

describe("validateTemplate — view payload", () => {
  it("accepts arbitrary payload on view (sprayed at instantiate time)", () => {
    expect(() => validateTemplate({
      ...baseValid,
      page: {
        ...baseValid.page,
        databases: [{
          ref: "db", name: "D", icon: "📋",
          properties: [{ id: "n", name: "N", type: "text" }],
          views: [{
            id: "v1", type: "dashboard", name: "D",
            payload: { dashboardKPIs: ["x"], dashboardBreakdowns: ["y"] },
          }],
        }],
      },
    })).not.toThrow();
  });
});
