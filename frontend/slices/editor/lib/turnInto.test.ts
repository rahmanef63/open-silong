import { describe, expect, it } from "vitest";
import { buildTurnIntoPatch, buildSmartTurnIntoPatch } from "./turnInto";

describe("buildTurnIntoPatch", () => {
  it("paragraph: clears text, no extras", () => {
    expect(buildTurnIntoPatch("paragraph")).toEqual({ type: "paragraph", text: "" });
  });

  it("h1: clears text", () => {
    expect(buildTurnIntoPatch("h1")).toEqual({ type: "h1", text: "" });
  });

  it("todo: initialises checked to false", () => {
    expect(buildTurnIntoPatch("todo")).toEqual({
      type: "todo",
      text: "",
      checked: false,
    });
  });

  it("toggle: initialises children + collapsed", () => {
    expect(buildTurnIntoPatch("toggle")).toEqual({
      type: "toggle",
      text: "",
      children: [],
      collapsed: false,
    });
  });

  it("synced: initialises children + fresh syncId", () => {
    const p = buildTurnIntoPatch("synced");
    expect(p.type).toBe("synced");
    expect(p.text).toBe("");
    expect(p.children).toEqual([]);
    expect(typeof p.syncId).toBe("string");
    expect(p.syncId!.length).toBeGreaterThan(0);
  });

  it("keepText:true skips the text:'' wipe", () => {
    expect(buildTurnIntoPatch("h1", { keepText: true })).toEqual({ type: "h1" });
    expect(buildTurnIntoPatch("bullet", { keepText: true })).toEqual({ type: "bullet" });
  });

  it("keepText:true still seeds todo.checked", () => {
    expect(buildTurnIntoPatch("todo", { keepText: true })).toEqual({
      type: "todo",
      checked: false,
    });
  });

  it("keepText:true still seeds toggle.children + collapsed", () => {
    expect(buildTurnIntoPatch("toggle", { keepText: true })).toEqual({
      type: "toggle",
      children: [],
      collapsed: false,
    });
  });
});

describe("buildSmartTurnIntoPatch", () => {
  it("preserves text when text-shape → text-shape (paragraph → quote)", () => {
    expect(buildSmartTurnIntoPatch("paragraph", "quote")).toEqual({ type: "quote" });
  });

  it("preserves text bullet → numbered", () => {
    expect(buildSmartTurnIntoPatch("bullet", "numbered")).toEqual({ type: "numbered" });
  });

  it("clears text when text-shape → non-text-shape (paragraph → toggle)", () => {
    expect(buildSmartTurnIntoPatch("paragraph", "toggle")).toEqual({
      type: "toggle",
      text: "",
      children: [],
      collapsed: false,
    });
  });

  it("clears text when non-text → text (image → paragraph)", () => {
    expect(buildSmartTurnIntoPatch("image", "paragraph")).toEqual({
      type: "paragraph",
      text: "",
    });
  });

  it("text-shape → text-shape with todo still seeds checked", () => {
    expect(buildSmartTurnIntoPatch("paragraph", "todo")).toEqual({
      type: "todo",
      checked: false,
    });
  });
});
