import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";
import { mcpHandler } from "./mcp/http";

const http = httpRouter();
auth.addHttpRoutes(http);

// Nosion MCP — Notion-canonical JSON over Bearer-token HTTPS.
// See `convex/mcp/http.ts` for tool dispatch + auth model.
http.route({ path: "/mcp/v1", method: "POST", handler: mcpHandler });

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
