/** Web Crypto sha256 → hex. Available in Convex V8 isolate (queries,
 *  mutations, http actions) — no Node import needed. */
export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Cryptographically random 32-byte token, base64url-encoded with the
 *  `nsn_` prefix so the http surface can route plaintext tokens to the
 *  per-user lookup branch (env-baked tokens lack the prefix). */
export function generateMcpToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  const b64 = btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `nsn_${b64}`;
}
