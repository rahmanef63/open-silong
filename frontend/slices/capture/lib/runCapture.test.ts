import { describe, expect, it, vi } from "vitest";
import { runCapture, type CaptureRunnerDeps } from "./runCapture";
import type { CaptureInput } from "../types";

const mkDeps = (over: Partial<CaptureRunnerDeps> = {}): CaptureRunnerDeps => ({
  createPage: vi.fn(async (_p, _o) => ({ id: "new1" })),
  setBlocks: vi.fn(),
  toBlocks: vi.fn((md: string) => [{ type: "paragraph", text: md }]),
  navigate: vi.fn(),
  pageUrl: (id) => `/dashboard/p/${id}`,
  ...over,
});

const input = (o: Partial<CaptureInput> = {}): CaptureInput => ({ title: "T", body: "", ...o });

describe("runCapture", () => {
  it("creates a page with the title under the resolved parent, then navigates", async () => {
    const deps = mkDeps({ prefs: { defaultDestination: { kind: "page", pageId: "home" } } });
    const id = await runCapture(input({ title: "Note" }), deps);
    expect(id).toBe("new1");
    expect(deps.createPage).toHaveBeenCalledWith("home", { title: "Note" });
    expect(deps.navigate).toHaveBeenCalledWith("/dashboard/p/new1");
  });

  it("title-only capture does NOT call setBlocks (single create)", async () => {
    const deps = mkDeps();
    await runCapture(input({ title: "Just title", body: "" }), deps);
    expect(deps.setBlocks).not.toHaveBeenCalled();
    expect(deps.toBlocks).not.toHaveBeenCalled();
  });

  it("body capture parses + persists blocks onto the new page", async () => {
    const deps = mkDeps();
    await runCapture(input({ title: "T", body: "- a\n- b" }), deps);
    expect(deps.toBlocks).toHaveBeenCalledWith("- a\n- b");
    expect(deps.setBlocks).toHaveBeenCalledWith("new1", [{ type: "paragraph", text: "- a\n- b" }]);
  });

  it("whitespace-only body is treated as no body", async () => {
    const deps = mkDeps();
    await runCapture(input({ title: "T", body: "   \n  " }), deps);
    expect(deps.setBlocks).not.toHaveBeenCalled();
  });

  it("no prefs → creates at workspace-root (null parent)", async () => {
    const deps = mkDeps();
    await runCapture(input(), deps);
    expect(deps.createPage).toHaveBeenCalledWith(null, { title: "T" });
  });

  it("inbox destination without pinned id → root fallback", async () => {
    const deps = mkDeps({ prefs: { defaultDestination: { kind: "inbox" } } });
    await runCapture(input(), deps);
    expect(deps.createPage).toHaveBeenCalledWith(null, { title: "T" });
  });

  it("ordering: create → setBlocks → navigate", async () => {
    const calls: string[] = [];
    const deps = mkDeps({
      createPage: vi.fn(async () => { calls.push("create"); return { id: "x" }; }),
      setBlocks: vi.fn(async () => { calls.push("blocks"); }),
      navigate: () => calls.push("nav"),
    });
    await runCapture(input({ body: "x" }), deps);
    expect(calls).toEqual(["create", "blocks", "nav"]);
  });
});
