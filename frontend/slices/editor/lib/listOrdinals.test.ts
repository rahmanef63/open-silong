import { describe, expect, it } from "vitest";
import type { Block } from "@/shared/types/domain";
import { computeOrdinals } from "./listOrdinals";

const b = (id: string, type: Block["type"]): Block => ({ id, type, text: "" });

describe("computeOrdinals", () => {
  it("returns empty map for empty input", () => {
    expect(computeOrdinals([])).toEqual(new Map());
  });

  it("numbers consecutive numbered blocks 1-based", () => {
    const out = computeOrdinals([
      b("a", "numbered"),
      b("b", "numbered"),
      b("c", "numbered"),
    ]);
    expect(out.get("a")).toBe(1);
    expect(out.get("b")).toBe(2);
    expect(out.get("c")).toBe(3);
  });

  it("resets counter when a non-numbered block interrupts", () => {
    const out = computeOrdinals([
      b("a", "numbered"),
      b("b", "numbered"),
      b("c", "paragraph"),
      b("d", "numbered"),
      b("e", "numbered"),
    ]);
    expect(out.get("a")).toBe(1);
    expect(out.get("b")).toBe(2);
    expect(out.has("c")).toBe(false);
    expect(out.get("d")).toBe(1);
    expect(out.get("e")).toBe(2);
  });

  it("ignores non-numbered block types entirely", () => {
    const out = computeOrdinals([
      b("a", "bullet"),
      b("b", "todo"),
      b("c", "quote"),
    ]);
    expect(out.size).toBe(0);
  });

  it("handles a single numbered block", () => {
    const out = computeOrdinals([b("solo", "numbered")]);
    expect(out.get("solo")).toBe(1);
  });
});
