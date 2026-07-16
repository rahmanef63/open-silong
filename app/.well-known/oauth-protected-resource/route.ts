import { NextResponse } from "next/server";

/** RFC 9728 OAuth 2.0 Protected Resource Metadata.
 *  Tells ChatGPT which authorization server protects the MCP endpoint. */

// Static metadata — prerendered under cacheComponents; the response's own
// cache-control header still drives client/proxy caching.

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://silong.rahmanef.com";
const MCP = process.env.NEXT_PUBLIC_MCP_URL ?? "https://site-silong.rahmanef.com/mcp";

export function GET() {
  const metadata = {
    resource: MCP,
    authorization_servers: [SITE],
    scopes_supported: ["mcp.read", "mcp.write"],
    bearer_methods_supported: ["header"],
  };
  return NextResponse.json(metadata, {
    headers: { "cache-control": "public, max-age=3600" },
  });
}
