import { describe, expect, it, vi } from "vitest";
import type { ButtonAction } from "@/shared/types/domain";
import { runButtonActions, type ButtonActionHandlers } from "./buttonActions";

const mkHandlers = (overrides: Partial<ButtonActionHandlers> = {}): ButtonActionHandlers => ({
  openUrl: vi.fn(),
  openPage: vi.fn(),
  confirm: vi.fn(() => true),
  editProperty: vi.fn(),
  ...overrides,
});

describe("runButtonActions", () => {
  it("dispatches each kind to the right handler", () => {
    const h = mkHandlers();
    const actions: ButtonAction[] = [
      { kind: "open_url", url: "http://x" },
      { kind: "open_page", pageId: "p1" },
      { kind: "edit_property", propId: "status", value: "done" },
    ];
    const ran = runButtonActions(actions, h);
    expect(ran).toBe(3);
    expect(h.openUrl).toHaveBeenCalledWith("http://x");
    expect(h.openPage).toHaveBeenCalledWith("p1");
    expect(h.editProperty).toHaveBeenCalledWith("status", "done");
  });

  it("runs actions in order", () => {
    const calls: string[] = [];
    const h = mkHandlers({
      openUrl: () => calls.push("url"),
      editProperty: () => calls.push("edit"),
    });
    runButtonActions(
      [{ kind: "edit_property", propId: "p", value: 1 }, { kind: "open_url", url: "u" }],
      h,
    );
    expect(calls).toEqual(["edit", "url"]);
  });

  it("show_confirmation that returns true continues the chain", () => {
    const h = mkHandlers({ confirm: vi.fn(() => true) });
    const ran = runButtonActions(
      [{ kind: "show_confirmation", message: "ok?" }, { kind: "open_url", url: "u" }],
      h,
    );
    expect(ran).toBe(2);
    expect(h.openUrl).toHaveBeenCalled();
  });

  it("show_confirmation that returns false ABORTS the remaining chain", () => {
    const h = mkHandlers({ confirm: vi.fn(() => false) });
    const ran = runButtonActions(
      [{ kind: "show_confirmation", message: "sure?" }, { kind: "open_url", url: "u" }],
      h,
    );
    expect(ran).toBe(1); // confirmation counted, url skipped
    expect(h.openUrl).not.toHaveBeenCalled();
  });

  it("empty action list runs nothing", () => {
    const h = mkHandlers();
    expect(runButtonActions([], h)).toBe(0);
    expect(h.openUrl).not.toHaveBeenCalled();
  });

  it("unknown action kind is skipped defensively", () => {
    const h = mkHandlers();
    const ran = runButtonActions(
      [{ kind: "future_kind" } as unknown as ButtonAction, { kind: "open_url", url: "u" }],
      h,
    );
    expect(ran).toBe(1); // only the known one
    expect(h.openUrl).toHaveBeenCalled();
  });

  it("multiple confirmations — first cancel stops before later edits", () => {
    const h = mkHandlers({ confirm: vi.fn(() => false) });
    runButtonActions(
      [
        { kind: "edit_property", propId: "a", value: 1 },
        { kind: "show_confirmation", message: "?" },
        { kind: "edit_property", propId: "b", value: 2 },
      ],
      h,
    );
    expect(h.editProperty).toHaveBeenCalledTimes(1);
    expect(h.editProperty).toHaveBeenCalledWith("a", 1);
  });
});
