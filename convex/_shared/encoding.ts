/** Byte-encoding helpers shared across the Convex backend. Web Crypto only
 *  (no Node `Buffer`) — available in every V8 isolate (queries, mutations,
 *  http actions). */

/** Lowercase hex string, one 2-char pair per byte. */
export const toHex = (u8: Uint8Array): string =>
  Array.from(u8)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

/** base64url (RFC 4648 §5) — `+`→`-`, `/`→`_`, padding stripped. */
export const toBase64Url = (buf: ArrayBuffer | Uint8Array): string => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
