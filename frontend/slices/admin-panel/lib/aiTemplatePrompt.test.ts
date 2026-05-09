import { describe, it, expect } from "vitest";
import { buildAiPrompt, extractJson, AI_PROVIDERS } from "./aiTemplatePrompt";

describe("buildAiPrompt", () => {
  it("includes user intent verbatim", () => {
    const p = buildAiPrompt("a CRM for podcast guests");
    expect(p).toContain("a CRM for podcast guests");
  });
  it("includes schema spec", () => {
    const p = buildAiPrompt("anything");
    expect(p).toContain("TemplateJson schema");
    expect(p).toContain("dashboard");
    expect(p).toContain("relationDatabaseRef");
  });
  it("instructs JSON-only output", () => {
    const p = buildAiPrompt("x");
    expect(p).toMatch(/ONE JSON object/);
  });
  it("supplies a fallback when intent is empty", () => {
    const p = buildAiPrompt("");
    expect(p).toContain("no intent supplied");
  });
});

describe("extractJson", () => {
  it("extracts from a ```json fence", () => {
    expect(extractJson('here is the json:\n```json\n{"a": 1}\n```\nthanks!'))
      .toBe('{"a": 1}');
  });
  it("extracts from a bare ``` fence", () => {
    expect(extractJson('```\n{"b": 2}\n```')).toBe('{"b": 2}');
  });
  it("greedy first-{ to last-} when no fence", () => {
    expect(extractJson('blah {"x": 3} more')).toBe('{"x": 3}');
  });
  it("returns input unchanged when no JSON detected", () => {
    expect(extractJson("nothing useful here")).toBe("nothing useful here");
  });
  it("handles nested objects", () => {
    expect(extractJson('preamble {"a": {"b": 1}} epilogue'))
      .toBe('{"a": {"b": 1}}');
  });
});

describe("AI_PROVIDERS", () => {
  it("has exactly 4 providers", () => {
    expect(AI_PROVIDERS).toHaveLength(4);
  });
  it("each has id+label+url+emoji", () => {
    for (const p of AI_PROVIDERS) {
      expect(p.id).toBeDefined();
      expect(p.label).toBeDefined();
      expect(p.url).toMatch(/^https?:\/\//);
      expect(p.emoji.length).toBeGreaterThan(0);
    }
  });
});
