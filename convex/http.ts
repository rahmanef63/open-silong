import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";
import { mcpHandler } from "./mcp/http";
import { mcpRpcHandler } from "./mcp/jsonrpc";
import { protectedResourceMetadata, authorizationServerMetadata } from "./mcp/wellKnown";
import { inboundEmail } from "./email/inbound";

const http = httpRouter();
auth.addHttpRoutes(http);

// Nosion MCP (legacy) — Notion-canonical JSON over Bearer-token HTTPS.
// {tool, args} body shape; used by scripts.
http.route({ path: "/mcp/v1", method: "POST", handler: mcpHandler });

// Nosion MCP (spec-compliant JSON-RPC 2.0) — for ChatGPT custom apps
// and any client speaking the Model Context Protocol. Phase 1: bearer
// only (Phase 2 will wrap with OAuth 2.1 + PKCE).
http.route({ path: "/mcp", method: "POST", handler: mcpRpcHandler });
http.route({
  path: "/mcp", method: "OPTIONS",
  handler: httpAction(async () => new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "authorization, content-type, mcp-protocol-version",
      "access-control-max-age": "86400",
    },
  })),
});

// OAuth discovery (RFC 9728 + RFC 8414) at the MCP origin so ChatGPT
// custom-app + any MCP-aware client can find the AS. See wellKnown.ts.
http.route({
  path: "/.well-known/oauth-protected-resource",
  method: "GET",
  handler: protectedResourceMetadata,
});
http.route({
  path: "/.well-known/oauth-authorization-server",
  method: "GET",
  handler: authorizationServerMetadata,
});

// Email → page ingest. Disabled unless EMAIL_INBOUND_TOKEN +
// EMAIL_TARGET_USER_ID env vars are set in the Convex backend.
// See `convex/email/inbound.ts` for body shape + auth.
http.route({ path: "/email/inbound", method: "POST", handler: inboundEmail });

// CORS preflight — some MCP clients (browsers, certain SDKs) prefetch
// with OPTIONS before the real POST. Answer 204 with permissive CORS.
http.route({
  path: "/mcp/v1",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "authorization, content-type",
      "access-control-max-age": "86400",
    },
  })),
});

export default http;
