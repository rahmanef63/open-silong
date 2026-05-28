import { describe, expect, it } from "vitest";
import { randomHex, sha256Base64Url, verifyPkce } from "./pkce";

// RFC 7636 Appendix B canonical S256 vector.
const RFC_VERIFIER = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
const RFC_CHALLENGE = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";

describe("sha256Base64Url", () => {
  it("matches the RFC 7636 Appendix B vector", async () => {
    expect(await sha256Base64Url(RFC_VERIFIER)).toBe(RFC_CHALLENGE);
  });

  it("emits unpadded base64url (no +, /, or =) of length 43 for SHA-256", async () => {
    const out = await sha256Base64Url("anything");
    expect(out).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(out).toHaveLength(43);
  });

  it("is deterministic", async () => {
    expect(await sha256Base64Url("x")).toBe(await sha256Base64Url("x"));
    expect(await sha256Base64Url("x")).not.toBe(await sha256Base64Url("y"));
  });
});

describe("randomHex", () => {
  it("returns 2 hex chars per byte", () => {
    expect(randomHex(16)).toHaveLength(32);
    expect(randomHex(16)).toMatch(/^[0-9a-f]+$/);
    expect(randomHex(0)).toBe("");
  });

  it("is (practically) unique per call", () => {
    expect(randomHex(16)).not.toBe(randomHex(16));
  });
});

describe("verifyPkce", () => {
  it("accepts the RFC vector under S256", async () => {
    expect(await verifyPkce(RFC_VERIFIER, RFC_CHALLENGE, "S256")).toBe(true);
  });

  it("rejects a non-S256 method (plain is not allowed)", async () => {
    expect(await verifyPkce(RFC_VERIFIER, RFC_CHALLENGE, "plain")).toBe(false);
    expect(await verifyPkce(RFC_VERIFIER, RFC_VERIFIER, "")).toBe(false);
  });

  it("rejects a wrong or tampered challenge", async () => {
    expect(await verifyPkce(RFC_VERIFIER, "F" + RFC_CHALLENGE.slice(1), "S256")).toBe(false);
    expect(await verifyPkce(RFC_VERIFIER, "totally-wrong", "S256")).toBe(false); // length mismatch
  });

  it("rejects out-of-range verifier lengths (RFC: 43..128)", async () => {
    expect(await verifyPkce("", RFC_CHALLENGE, "S256")).toBe(false);
    expect(await verifyPkce("a".repeat(42), RFC_CHALLENGE, "S256")).toBe(false);
    expect(await verifyPkce("a".repeat(129), RFC_CHALLENGE, "S256")).toBe(false);
  });

  it("round-trips a freshly derived challenge", async () => {
    const verifier = "a".repeat(43);
    const challenge = await sha256Base64Url(verifier);
    expect(await verifyPkce(verifier, challenge, "S256")).toBe(true);
  });
});
