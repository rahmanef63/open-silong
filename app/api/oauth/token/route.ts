import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";

/** RFC 6749 §3.2 token endpoint. ChatGPT POSTs form-encoded:
 *    grant_type=authorization_code
 *    code=<code>
 *    redirect_uri=<uri>
 *    client_id=<id>
 *    code_verifier=<verifier>
 *  Response: JSON { access_token, token_type, expires_in, scope? } */

export const dynamic = "force-dynamic";
export const revalidate = 0;

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const errorResponse = (
  code: string,
  description: string,
  status = 400,
): NextResponse =>
  NextResponse.json(
    { error: code, error_description: description },
    {
      status,
      headers: { "cache-control": "no-store", pragma: "no-cache" },
    },
  );

const parseBody = async (req: Request): Promise<Record<string, string> | null> => {
  const ct = req.headers.get("content-type") ?? "";
  try {
    if (ct.includes("application/x-www-form-urlencoded")) {
      const text = await req.text();
      return Object.fromEntries(new URLSearchParams(text).entries());
    }
    if (ct.includes("application/json")) {
      return (await req.json()) as Record<string, string>;
    }
  } catch {
    return null;
  }
  return null;
};

export async function POST(req: Request) {
  const body = await parseBody(req);
  if (!body) return errorResponse("invalid_request", "Unparseable body");

  if (body.grant_type !== "authorization_code") {
    return errorResponse(
      "unsupported_grant_type",
      "Only authorization_code is supported",
    );
  }
  if (!body.code || !body.redirect_uri || !body.client_id || !body.code_verifier) {
    return errorResponse(
      "invalid_request",
      "Missing one of: code, redirect_uri, client_id, code_verifier",
    );
  }

  try {
    const result = await convex.mutation(api.oauth.mutations.exchangeCode, {
      code: body.code,
      codeVerifier: body.code_verifier,
      redirectUri: body.redirect_uri,
      clientId: body.client_id,
    });
    return NextResponse.json(result, {
      headers: { "cache-control": "no-store", pragma: "no-cache" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("oauth.token error", msg);
    if (msg.includes("invalid_grant")) {
      return errorResponse("invalid_grant", "code invalid", 400);
    }
    return errorResponse("server_error", "token exchange failed", 500);
  }
}

export function GET() {
  return errorResponse("invalid_request", "Use POST", 405);
}
