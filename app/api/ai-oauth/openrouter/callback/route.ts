import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { api } from "@convex/_generated/api";

/** BYOK OpenRouter connect — step 2. OpenRouter redirects back with `?code`.
 *  We read the PKCE verifier from the httpOnly cookie set in /start, exchange
 *  code+verifier for a real API key, and persist it through the SAME encrypted
 *  BYOK path as a pasted key (`aiKeys.save`, forwarding the signed-in user's
 *  Convex auth token). The key is never exposed to browser JS. */

// Reads the request (cookie + `?code`) → dynamic by nature under
// cacheComponents; the `dynamic = "force-dynamic"` segment config is gone.

function origin(req: NextRequest): string {
  const proto = req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? req.nextUrl.host;
  return `${proto}://${host}`;
}

export async function GET(req: NextRequest) {
  const back = (status: string) => {
    const res = NextResponse.redirect(`${origin(req)}/dashboard/settings?s=ai&connect=${status}`);
    res.cookies.delete({ name: "or_pkce", path: "/api/ai-oauth/openrouter" });
    return res;
  };

  const code = req.nextUrl.searchParams.get("code");
  const verifier = req.cookies.get("or_pkce")?.value;
  if (!code || !verifier) return back("error");

  try {
    const r = await fetch("https://openrouter.ai/api/v1/auth/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, code_verifier: verifier, code_challenge_method: "S256" }),
    });
    if (!r.ok) throw new Error(`OpenRouter key exchange failed (${r.status})`);
    const { key } = (await r.json()) as { key?: string };
    if (!key) throw new Error("OpenRouter returned no key");

    const token = await convexAuthNextjsToken();
    if (!token) throw new Error("not signed in");
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    convex.setAuth(token);
    await convex.action(api.aiKeys.save.save, {
      scope: "personal",
      provider: "openrouter",
      plaintextKey: key,
      label: "OpenRouter (OAuth)",
      enabledModels: [],
      preferOwn: true,
    });
    return back("openrouter");
  } catch (e) {
    console.warn("openrouter oauth callback", e instanceof Error ? e.message : e);
    return back("error");
  }
}
