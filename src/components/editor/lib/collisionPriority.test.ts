import { describe, it, expect } from "vitest";
import type { Collision } from "@dnd-kit/core";
import { prioritizeCollisions } from "./collisionPriority";

const hit = (id: string): Collision => ({ id, data: {} } as Collision);

describe("prioritizeCollisions", () => {
  it("returns leaf when only leaf hits present", () => {
    const result = prioritizeCollisions([hit("a"), hit("b")]);
    expect(result.map((c) => c.id)).toEqual(["a", "b"]);
  });

  it("suppresses container's own sortable id when its inner droppable is present", () => {
    // Hovering empty space inside toggle T:
    //   pointerWithin returns [toggle:T, T] — T is the toggle block's own sortable id.
    //   Without suppression, top-level reorder of T is selected (bug).
    const result = prioritizeCollisions([hit("toggle:T"), hit("T")]);
    expect(result.map((c) => c.id)).toEqual(["toggle:T"]);
  });

  it("prefers leaf child over container droppable when child is hit", () => {
    // Hovering a child block in toggle T:
    //   within = [child1, toggle:T, T]
    const result = prioritizeCollisions([hit("child1"), hit("toggle:T"), hit("T")]);
    expect(result.map((c) => c.id)).toEqual(["child1"]);
  });

  it("suppresses columns-block sortable id when col:* hit present", () => {
    const result = prioritizeCollisions([hit("col:C:0"), hit("C")]);
    expect(result.map((c) => c.id)).toEqual(["col:C:0"]);
  });

  it("prefers leaf child in column over column droppable", () => {
    const result = prioritizeCollisions([hit("c00"), hit("col:C:0"), hit("C")]);
    expect(result.map((c) => c.id)).toEqual(["c00"]);
  });

  it("returns container hits when no leaf is present", () => {
    const result = prioritizeCollisions([hit("col:C:1")]);
    expect(result.map((c) => c.id)).toEqual(["col:C:1"]);
  });

  it("returns empty when within is empty", () => {
    expect(prioritizeCollisions([])).toEqual([]);
  });
});
