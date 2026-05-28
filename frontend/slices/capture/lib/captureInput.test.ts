import { describe, expect, it } from "vitest";
import {
  parseCaptureInput, resolveCaptureTarget, isEmptyCapture, captureTitleOrDefault,
} from "./captureInput";

describe("parseCaptureInput", () => {
  it("first non-empty line → title, rest → body", () => {
    expect(parseCaptureInput("Buy milk\n- 2%\n- whole")).toEqual({
      title: "Buy milk",
      body: "- 2%\n- whole",
    });
  });
  it("strips leading heading markers from the title", () => {
    expect(parseCaptureInput("## Meeting notes\nbody").title).toBe("Meeting notes");
  });
  it("skips leading blank lines to find the title", () => {
    expect(parseCaptureInput("\n\n  Title here  \nbody").title).toBe("Title here");
  });
  it("trims leading blank lines off the body", () => {
    expect(parseCaptureInput("Title\n\n\nbody line").body).toBe("body line");
  });
  it("title-only input → empty body", () => {
    expect(parseCaptureInput("Just a title")).toEqual({ title: "Just a title", body: "" });
  });
  it("empty / whitespace input → empty title + body", () => {
    expect(parseCaptureInput("")).toEqual({ title: "", body: "" });
    expect(parseCaptureInput("   \n  ")).toEqual({ title: "", body: "" });
  });
  it("CRLF normalized", () => {
    expect(parseCaptureInput("T\r\nb1\r\nb2")).toEqual({ title: "T", body: "b1\nb2" });
  });
  it("preserves body markdown verbatim (parsed downstream)", () => {
    const out = parseCaptureInput("Notes\n# H1\n```js\nx=1\n```");
    expect(out.body).toBe("# H1\n```js\nx=1\n```");
  });
});

describe("resolveCaptureTarget", () => {
  it("page destination → that page is the parent", () => {
    expect(resolveCaptureTarget({ defaultDestination: { kind: "page", pageId: "p1" } }))
      .toEqual({ parentId: "p1" });
  });
  it("inbox destination → pinned inbox page id", () => {
    expect(resolveCaptureTarget({ defaultDestination: { kind: "inbox" }, inboxPageId: "ibx" }))
      .toEqual({ parentId: "ibx" });
  });
  it("inbox destination without pinned id → workspace-root fallback", () => {
    expect(resolveCaptureTarget({ defaultDestination: { kind: "inbox" } }))
      .toEqual({ parentId: null });
  });
  it("workspace-root → null parent", () => {
    expect(resolveCaptureTarget({ defaultDestination: { kind: "workspace-root" } }))
      .toEqual({ parentId: null });
  });
  it("no prefs → workspace-root default", () => {
    expect(resolveCaptureTarget(undefined)).toEqual({ parentId: null });
  });
});

describe("isEmptyCapture + captureTitleOrDefault", () => {
  it("isEmptyCapture true only for blank/whitespace", () => {
    expect(isEmptyCapture("")).toBe(true);
    expect(isEmptyCapture("   \n ")).toBe(true);
    expect(isEmptyCapture("x")).toBe(false);
  });
  it("captureTitleOrDefault falls back to 'Quick note'", () => {
    expect(captureTitleOrDefault({ title: "Real", body: "" })).toBe("Real");
    expect(captureTitleOrDefault({ title: "  ", body: "x" })).toBe("Quick note");
  });
});
