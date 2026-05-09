/** @vitest-environment jsdom */
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDialogState } from "./useDialogState";

describe("useDialogState", () => {
  it("starts empty", () => {
    const { result } = renderHook(() => useDialogState<{ x: number }>());
    expect(result.current.data).toBeNull();
    expect(result.current.done).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("setData clears error", () => {
    const { result } = renderHook(() => useDialogState<string>());
    act(() => { result.current.setError("nope"); });
    expect(result.current.error).toBe("nope");
    act(() => { result.current.setData("hello"); });
    expect(result.current.data).toBe("hello");
    expect(result.current.error).toBeNull();
  });

  it("markDone toggles done + clears error", () => {
    const { result } = renderHook(() => useDialogState());
    act(() => { result.current.setError("x"); });
    act(() => { result.current.markDone(); });
    expect(result.current.done).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("reset clears every field", () => {
    const { result } = renderHook(() => useDialogState<string>());
    act(() => { result.current.setData("a"); });
    act(() => { result.current.setError("e"); });
    act(() => { result.current.markDone(); });
    act(() => { result.current.reset(); });
    expect(result.current.data).toBeNull();
    expect(result.current.done).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
