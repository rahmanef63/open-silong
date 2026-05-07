import { describe, expect, it } from "vitest";
import { TOP_LEVEL_PLACEHOLDERS, NESTED_PLACEHOLDERS } from "./placeholders";
import type { BlockType } from "@/shared/types/domain";

const ALL_BLOCK_TYPES: BlockType[] = [
  "paragraph", "h1", "h2", "h3",
  "todo", "bullet", "numbered", "quote", "code",
  "divider", "callout", "page", "database",
  "columns2", "columns3", "toggle",
  "image", "equation", "table", "embed", "button",
];

describe("TOP_LEVEL_PLACEHOLDERS", () => {
  it("covers every BlockType (string or empty)", () => {
    for (const t of ALL_BLOCK_TYPES) {
      expect(TOP_LEVEL_PLACEHOLDERS[t]).toBeDefined();
    }
  });

  it("paragraph hints at slash-command discovery", () => {
    expect(TOP_LEVEL_PLACEHOLDERS.paragraph).toMatch(/\//);
  });

  it("non-text blocks have empty placeholder (hidden)", () => {
    for (const t of ["divider", "image", "equation", "table", "embed", "button", "page", "database", "columns2", "columns3", "toggle"] as BlockType[]) {
      expect(TOP_LEVEL_PLACEHOLDERS[t]).toBe("");
    }
  });
});

describe("NESTED_PLACEHOLDERS", () => {
  it("only covers text-bearing blocks", () => {
    expect(NESTED_PLACEHOLDERS.paragraph).toBeDefined();
    expect(NESTED_PLACEHOLDERS.divider).toBeUndefined();
    expect(NESTED_PLACEHOLDERS.image).toBeUndefined();
  });

  it("uses terser hints than the top-level set", () => {
    // top-level paragraph mentions /, nested is just a nudge
    expect(NESTED_PLACEHOLDERS.paragraph?.length ?? 0)
      .toBeLessThan(TOP_LEVEL_PLACEHOLDERS.paragraph.length);
  });
});
