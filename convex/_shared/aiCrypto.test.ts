import { afterEach, describe, expect, it } from "vitest";
import { decryptApiKey, encryptApiKey, isEncryptedApiKey } from "./aiCrypto";

const ENV = "AI_KEY_ENCRYPTION_SECRET";
const SECRET = "a-sufficiently-long-secret-1234567890";
const original = process.env[ENV];

afterEach(() => {
  if (original === undefined) delete process.env[ENV];
  else process.env[ENV] = original;
});

describe("isEncryptedApiKey", () => {
  it("detects the enc:v1: envelope prefix", () => {
    expect(isEncryptedApiKey("enc:v1:abc:def")).toBe(true);
    expect(isEncryptedApiKey("sk-plain")).toBe(false);
    expect(isEncryptedApiKey("")).toBe(false);
  });
});

describe("without a usable secret (plaintext-at-rest)", () => {
  it("passes plaintext through unchanged when no secret is set", async () => {
    delete process.env[ENV];
    expect(await encryptApiKey("sk-plain")).toBe("sk-plain");
    expect(await decryptApiKey("sk-plain")).toBe("sk-plain");
    expect(await encryptApiKey("")).toBe("");
  });

  it("treats a too-short secret (<16 chars) as no secret", async () => {
    process.env[ENV] = "short";
    expect(await encryptApiKey("sk-plain")).toBe("sk-plain");
  });
});

describe("with a secret", () => {
  it("encrypts into a 4-segment enc:v1: envelope", async () => {
    process.env[ENV] = SECRET;
    const enc = await encryptApiKey("sk-secret-123");
    expect(isEncryptedApiKey(enc)).toBe(true);
    expect(enc.split(":")).toHaveLength(4);
    expect(enc).not.toContain("sk-secret-123");
  });

  it("round-trips (the regression: decrypt used to drop the ciphertext)", async () => {
    process.env[ENV] = SECRET;
    expect(await decryptApiKey(await encryptApiKey("sk-secret-123"))).toBe("sk-secret-123");
  });

  it("round-trips unicode", async () => {
    process.env[ENV] = SECRET;
    const v = "café-🔑-clé";
    expect(await decryptApiKey(await encryptApiKey(v))).toBe(v);
  });

  it("uses a random IV (same plaintext → different ciphertext, both decrypt)", async () => {
    process.env[ENV] = SECRET;
    const a = await encryptApiKey("dup");
    const b = await encryptApiKey("dup");
    expect(a).not.toBe(b);
    expect(await decryptApiKey(a)).toBe("dup");
    expect(await decryptApiKey(b)).toBe("dup");
  });

  it("passes an empty string through without enveloping", async () => {
    process.env[ENV] = SECRET;
    expect(await encryptApiKey("")).toBe("");
  });
});

describe("decrypt error paths", () => {
  it("throws an actionable error when the envelope outlives its secret", async () => {
    process.env[ENV] = SECRET;
    const enc = await encryptApiKey("sk-secret-123");
    delete process.env[ENV];
    await expect(decryptApiKey(enc)).rejects.toThrow(/AI_KEY_ENCRYPTION_SECRET/);
  });

  it("throws on a malformed envelope", async () => {
    process.env[ENV] = SECRET;
    await expect(decryptApiKey("enc:v1:onlyonepart")).rejects.toThrow(/Malformed/);
  });

  it("throws when decrypted with the wrong secret", async () => {
    process.env[ENV] = SECRET;
    const enc = await encryptApiKey("sk-secret-123");
    process.env[ENV] = "a-different-long-secret-0987654321";
    await expect(decryptApiKey(enc)).rejects.toThrow();
  });
});
