/** PKCE S256 helpers — RFC 7636.
 *  Convex isolate exposes SubtleCrypto via global `crypto`. No node:crypto. */

const toBase64Url = (buf: ArrayBuffer): string => {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

export const sha256Base64Url = async (input: string): Promise<string> => {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  return toBase64Url(buf);
};

export const randomHex = (byteLen: number): string => {
  const bytes = new Uint8Array(byteLen);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

/** Verify codeVerifier matches stored codeChallenge.
 *  S256 only — `plain` is rejected since ChatGPT advertises S256. */
export const verifyPkce = async (
  codeVerifier: string,
  codeChallenge: string,
  method: string,
): Promise<boolean> => {
  if (method !== "S256") return false;
  if (!codeVerifier || codeVerifier.length < 43 || codeVerifier.length > 128) {
    return false;
  }
  const derived = await sha256Base64Url(codeVerifier);
  if (derived.length !== codeChallenge.length) return false;
  let acc = 0;
  for (let i = 0; i < derived.length; i++) {
    acc |= derived.charCodeAt(i) ^ codeChallenge.charCodeAt(i);
  }
  return acc === 0;
};
