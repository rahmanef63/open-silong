#!/usr/bin/env node
/** Nosion MCP server — stdio bridge to a Nosion deployment.
 *
 *  Speaks the Model Context Protocol over stdio (the Claude Desktop /
 *  Claude Code transport) and forwards every `tools/call` to the
 *  Nosion `/mcp/v1` HTTPS endpoint as a single POST.
 *
 *  Usage (claude_desktop_config.json):
 *    {
 *      "mcpServers": {
 *        "nosion": {
 *          "command": "node",
 *          "args": ["/abs/path/to/nosion/mcp/dist/server.js"],
 *          "env": {
 *            "NOSION_BASE_URL": "https://api-silong.rahmanef.com",
 *            "NOSION_MCP_TOKEN": "<MCP_API_TOKEN value from convex deployment>"
 *          }
 *        }
 *      }
 *    }
 *
 *  Env:
 *    NOSION_BASE_URL  — Convex HTTP origin (no trailing slash).
 *    NOSION_MCP_TOKEN — Bearer token (matches `MCP_API_TOKEN` env on
 *                       the Convex deployment).
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { TOOLS } from "./tools.js";

const BASE_URL = process.env.NOSION_BASE_URL?.replace(/\/$/, "");
const TOKEN = process.env.NOSION_MCP_TOKEN;

if (!BASE_URL) {
  console.error("[nosion-mcp] NOSION_BASE_URL is required");
  process.exit(1);
}
if (!TOKEN) {
  console.error("[nosion-mcp] NOSION_MCP_TOKEN is required");
  process.exit(1);
}

const server = new Server(
  { name: "nosion-mcp", version: "0.1.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
  })),
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  const res = await fetch(`${BASE_URL}/mcp/v1`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({ tool: name, params: args ?? {} }),
  });
  const body = await res.json().catch(() => ({ ok: false, error: { message: `HTTP ${res.status}` } }));
  if (!res.ok || !body.ok) {
    const msg = body?.error?.message ?? `HTTP ${res.status}`;
    return {
      content: [{ type: "text", text: `Error: ${msg}` }],
      isError: true,
    };
  }
  return {
    content: [{ type: "text", text: JSON.stringify(body.data, null, 2) }],
  };
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Stays connected until stdin closes.
}

main().catch((e) => {
  console.error("[nosion-mcp] fatal:", e);
  process.exit(1);
});
