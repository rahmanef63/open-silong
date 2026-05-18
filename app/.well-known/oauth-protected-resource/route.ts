import { NextResponse } from "next/server";

/** RFC 9728 OAuth 2.0 Protected Resource Metadata.
 *  Tells ChatGPT which authorization server protects the MCP endpoint. */

export const revalidate = 3600;

const SITE = "https://nosion.rahmanef.com";
const MCP = "https://api-notion-page-clone.rahmanef.com/mcp";

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
