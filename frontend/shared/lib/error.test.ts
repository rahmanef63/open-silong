import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { sanitizeError, getErrorMessage, logError, reportError } from "./error";

describe("sanitizeError", () => {
  it("classifies chunk-load errors as chunk + retryable", () => {
    const err = Object.assign(new Error("Loading chunk 12 failed."), { name: "ChunkLoadError" });
    const safe = sanitizeError(err);
    expect(safe.category).toBe("chunk");
    expect(safe.retryable).toBe(true);
    expect(safe.message).not.toContain("chunk"); // user-facing wording, not technical
  });

  it("matches Failed to load chunk path-style messages", () => {
    const err = new Error("Failed to load chunk /_next/static/chunks/12z3h9eyj8ad-.js");
    expect(sanitizeError(err).category).toBe("chunk");
  });

  it("classifies Failed to fetch as network", () => {
    const safe = sanitizeError(new Error("Failed to fetch"));
    expect(safe.category).toBe("network");
    expect(safe.retryable).toBe(true);
  });

  it("classifies AbortError as network", () => {
    const err = Object.assign(new Error("aborted"), { name: "AbortError" });
    expect(sanitizeError(err).category).toBe("network");
  });

  it("classifies unauthenticated as auth", () => {
    expect(sanitizeError(new Error("Not authenticated")).category).toBe("auth");
    expect(sanitizeError(new Error("401 Unauthorized")).category).toBe("auth");
  });

  it("classifies permission_denied as permission", () => {
    expect(sanitizeError(new Error("permission_denied: cannot edit")).category).toBe("permission");
    expect(sanitizeError(new Error("403 forbidden")).category).toBe("permission");
  });

  it("classifies ArgumentValidationError as validation", () => {
    expect(sanitizeError(new Error("ArgumentValidationError: bad arg")).category).toBe("validation");
    const zod = Object.assign(new Error("invalid"), { name: "ZodError" });
    expect(sanitizeError(zod).category).toBe("validation");
  });

  it("classifies 404 not found", () => {
    expect(sanitizeError(new Error("Page not found")).category).toBe("not-found");
  });

  it("classifies rate limit", () => {
    expect(sanitizeError(new Error("429 Too Many Requests")).category).toBe("rate-limit");
  });

  it("classifies Convex framework error generically", () => {
    expect(sanitizeError(new Error("[CONVEX M(pages:create)] something")).category).toBe("convex");
  });

  it("classifies 5xx as server", () => {
    expect(sanitizeError(new Error("500 Internal Server Error")).category).toBe("server");
  });

  it("falls back to unknown when no signal matches", () => {
    expect(sanitizeError(new Error("random thing exploded")).category).toBe("unknown");
  });

  it("never leaks raw stack into message", () => {
    const ugly = new Error("[CONVEX Q(pages:list)] ServerError: connect ECONNREFUSED 127.0.0.1:5142\n    at /var/task/index.js:1234");
    const safe = sanitizeError(ugly);
    expect(safe.message).not.toMatch(/CONVEX|ECONNREFUSED|var\/task/);
  });

  it("handles non-Error throwables (string, object)", () => {
    expect(sanitizeError("permission_denied").category).toBe("permission");
    expect(sanitizeError({ message: "Failed to fetch" }).category).toBe("network");
    expect(sanitizeError(null).category).toBe("unknown");
    expect(sanitizeError(undefined).category).toBe("unknown");
  });
});

describe("getErrorMessage", () => {
  it("extracts from Error instance", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
  });
  it("returns string as-is", () => {
    expect(getErrorMessage("oops")).toBe("oops");
  });
  it("reads message from object", () => {
    expect(getErrorMessage({ message: "bad" })).toBe("bad");
  });
  it("falls back when JSON.stringify throws (circular)", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    // No `message` property — JSON.stringify on circular ref throws → fallback
    expect(getErrorMessage(circular, "fallback-msg")).toBe("fallback-msg");
  });
});

describe("logError + reportError", () => {
  let spy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    spy = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    spy.mockRestore();
    vi.unstubAllEnvs();
  });

  it("logError writes to console in dev", () => {
    vi.stubEnv("NODE_ENV", "development");
    logError("scope", new Error("dev-err"));
    expect(spy).toHaveBeenCalled();
  });

  it("logError is a no-op in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    logError("scope", new Error("prod-err"));
    expect(spy).not.toHaveBeenCalled();
  });

  it("reportError returns sanitized + logs", () => {
    vi.stubEnv("NODE_ENV", "development");
    const safe = reportError("scope", new Error("permission_denied"));
    expect(safe.category).toBe("permission");
    expect(spy).toHaveBeenCalled();
  });
});
