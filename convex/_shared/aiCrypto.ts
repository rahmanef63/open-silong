/** AES-GCM-256 envelope for provider API keys stored in `globalAISettings`.
 *
 *  Format: `enc:v1:<base64url(iv)>:<base64url(ciphertext+tag)>`
 *  Anything not starting with `enc:v1:` is treated as plaintext (legacy
 *  rows written before encryption shipped, OR runtime without
 *  `AI_KEY_ENCRYPTION_SECRET` set).
 *
 *  Key derivation: SHA-256 of the env secret → 32-byte AES key. PBKDF2
 *  would be overkill — the env secret is already high-entropy (admin
 *  supplies a long random string). Hash gives a stable 256-bit key.
 *
 *  Runs inside Convex isolate (queries / mutations / actions) — WebCrypto
 *  `crypto.subtle` is available everywhere. */

const PREFIX = "enc:v1:";

function envSecret(): string | null {
  const raw = process.env.AI_KEY_ENCRYPTION_SECRET?.trim();
  return raw && raw.length >= 16 ? raw : null;
}

async function deriveKey(secret: string): Promise<CryptoKey> {
  const bytes = new TextEncoder().encode(secret);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return await crypto.subtle.importKey("raw", hash, "AES-GCM", false, ["encrypt", "decrypt"]);
}

function b64uEncode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i += 1) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64uDecode(s: string): Uint8Array<ArrayBuffer> {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const norm = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(norm);
  const buf = new ArrayBuffer(bin.length);
  const out = new Uint8Array(buf);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

/** Encrypts plaintext into the envelope. When no env secret is set, returns
 *  the input unchanged (plaintext-at-rest) so unconfigured deployments
 *  keep working. Empty input passes through unchanged. */
export async function encryptApiKey(plain: string): Promise<string> {
  if (!plain) return plain;
  const secret = envSecret();
  if (!secret) return plain;
  const key = await deriveKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plain),
  );
  return `${PREFIX}${b64uEncode(iv)}:${b64uEncode(cipher)}`;
}

/** Decrypts an envelope. Pass-through for non-enveloped (plaintext) inputs.
 *  Throws when an envelope is present but the env secret is missing or
 *  wrong — caller can present an actionable error to the admin. */
export async function decryptApiKey(stored: string): Promise<string> {
  if (!stored || !stored.startsWith(PREFIX)) return stored;
  const secret = envSecret();
  if (!secret) {
    throw new Error(
      "AI key is encrypted but AI_KEY_ENCRYPTION_SECRET is not set on the Convex backend — set it and redeploy, or clear + re-enter the key.",
    );
  }
  const [, ivB64, ctB64] = stored.split(":");
  if (!ivB64 || !ctB64) throw new Error("Malformed encrypted AI key envelope");
  const key = await deriveKey(secret);
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64uDecode(ivB64) },
    key,
    b64uDecode(ctB64),
  );
  return new TextDecoder().decode(plain);
}

/** True when the stored value is encrypted (vs legacy plaintext). Used by
 *  admin UI to hint that rotation will move from plaintext → ciphertext. */
export function isEncryptedApiKey(stored: string): boolean {
  return stored.startsWith(PREFIX);
}
