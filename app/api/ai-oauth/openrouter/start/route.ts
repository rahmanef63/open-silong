import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";

/** BYOK OpenRouter connect — step 1 (app acts as OAuth CLIENT).
 *
 *  OpenRouter's PKCE flow issues a real user API key (no client id, it
 *  identifies the app by callback_url). We mint a PKCE verifier, stash it
 *  in a short-lived httpOnly cookie (SameSite=Lax survives the top-level
 *  redirect back), and bounce the user to openrouter.ai/auth. The verifier
 *  never reaches the browser JS or a DB — the /callback route reads the
 *  cookie to redeem the code for a key. See ../callback/route.ts. */

// Reads request headers + sets a cookie → dynamic by nature under
// cacheComponents; the `dynamic = "force-dynamic"` segment config is no
// longer permitted.

const b64url = (b: Buffer) => b.toString("base64url");

function origin(req: NextRequest): string {
  const proto = req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? req.nextUrl.host;
  return `${proto}://${host}`;
}

export function GET(req: NextRequest) {
  const verifier = b64url(crypto.randomBytes(32));
  const challenge = b64url(crypto.createHash("sha256").update(verifier).digest());
  const callback = `${origin(req)}/api/ai-oauth/openrouter/callback`;
  const url =
    `https://openrouter.ai/auth?callback_url=${encodeURIComponent(callback)}` +
    `&code_challenge=${challenge}&code_challenge_method=S256`;

  const res = NextResponse.redirect(url);
  res.cookies.set("or_pkce", verifier, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/ai-oauth/openrouter",
    maxAge: 600,
  });
  return res;
}
