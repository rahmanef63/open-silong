import { describe, expect, it } from "vitest";
import { isChunkLoadError } from "./ChunkErrorBoundary";

describe("isChunkLoadError", () => {
  it("matches ChunkLoadError name", () => {
    const e = Object.assign(new Error("Loading chunk 12 failed."), { name: "ChunkLoadError" });
    expect(isChunkLoadError(e)).toBe(true);
  });

  it("matches Failed to load chunk message", () => {
    expect(isChunkLoadError(new Error("Failed to load chunk 4 from /_next/static/chunks/abc.js"))).toBe(true);
  });

  it("matches CSS chunk message", () => {
    expect(isChunkLoadError(new Error("Loading CSS chunk 2 failed."))).toBe(true);
  });

  it("matches /_next/static/chunks path in message", () => {
    expect(isChunkLoadError(new Error("Failed to load /_next/static/chunks/12z3h9eyj8ad-.js"))).toBe(true);
  });

  it("rejects unrelated errors", () => {
    expect(isChunkLoadError(new Error("Network request failed"))).toBe(false);
    expect(isChunkLoadError(new Error("permission_denied"))).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
    expect(isChunkLoadError(undefined)).toBe(false);
  });

  it("handles non-Error throwables", () => {
    expect(isChunkLoadError({ name: "ChunkLoadError", message: "" })).toBe(true);
    expect(isChunkLoadError({ message: "Loading chunk failed" })).toBe(true);
  });
});
