/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { toast } from "sonner";
import { useAsyncError } from "./useAsyncError";

describe("useAsyncError", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts with no pending and no error", () => {
    const { result } = renderHook(() => useAsyncError("test"));
    expect(result.current.pending).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("returns the value on success and clears state", async () => {
    const { result } = renderHook(() => useAsyncError("test"));
    let value: number | undefined;
    await act(async () => {
      value = await result.current.execute(async () => 42);
    });
    expect(value).toBe(42);
    expect(result.current.pending).toBe(false);
    expect(result.current.error).toBeNull();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("on throw: sets error, fires toast, returns undefined", async () => {
    const { result } = renderHook(() => useAsyncError("test"));
    let value: unknown = "untouched";
    await act(async () => {
      value = await result.current.execute(async () => { throw new Error("boom"); });
    });
    expect(value).toBeUndefined();
    expect(result.current.pending).toBe(false);
    expect(result.current.error).not.toBeNull();
    expect(toast.error).toHaveBeenCalledTimes(1);
  });

  it("silent option suppresses the toast", async () => {
    const { result } = renderHook(() => useAsyncError("test"));
    await act(async () => {
      await result.current.execute(async () => { throw new Error("boom"); }, { silent: true });
    });
    expect(toast.error).not.toHaveBeenCalled();
    expect(result.current.error).not.toBeNull();
  });

  it("clear() resets the error", async () => {
    const { result } = renderHook(() => useAsyncError("test"));
    await act(async () => {
      await result.current.execute(async () => { throw new Error("boom"); });
    });
    expect(result.current.error).not.toBeNull();
    act(() => { result.current.clear(); });
    expect(result.current.error).toBeNull();
  });
});
