import { NextResponse } from "next/server";

/** RFC 8414 OAuth 2.0 Authorization Server Metadata.
 *  ChatGPT's connector form discovers these settings here so the admin
 *  can leave most fields blank and just paste the auth + token URLs.
 *  CIMD is not advertised (user-defined-client mode). DCR is not
 *  implemented — `registration_endpoint` is omitted. */

// Static metadata — prerendered under cacheComponents; the `public,
// max-age=3600` response header (below) still drives client/proxy caching.

const SITE = "https://silong.rahmanef.com";

export function GET() {
  const metadata = {
    issuer: SITE,
    authorization_endpoint: `${SITE}/oauth/authorize`,
    token_endpoint: `${SITE}/api/oauth/token`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: ["mcp.read", "mcp.write"],
    /** RFC 8707 — token can be scoped to the MCP endpoint. ChatGPT
     *  relies on this hint. */
    resource_indicators_supported: true,
  };
  return NextResponse.json(metadata, {
    headers: { "cache-control": "public, max-age=3600" },
  });
}
