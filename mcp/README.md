# Nosion MCP server

Bridges Claude Desktop / Claude Code (and any other MCP client) to a
Nosion deployment over stdio. Forwards every tool call to the Convex
`/mcp/v1` HTTPS endpoint with Bearer-token auth.

The wire format is **Notion-canonical JSON** — page objects, block
objects, property envelopes, and rich_text arrays follow Notion's API
shape so an LLM that already knows the Notion API can drive Nosion
without learning a new schema. The translation lives in
`convex/_shared/notionShape.ts` (server-side, pure, 44 unit tests).

## Why this exists

Nosion stores blocks as flat plain-strings with markdown markers
(Slack model), properties as ordered arrays, and 8-char base36 ids.
Notion uses rich_text segment arrays, name-keyed property maps, and
UUIDs. This server is the translation layer so neither side has to
change.

## Install

```bash
cd mcp
npm install
npm run build
```

## Configure the Convex backend

Set two env vars on the deployment (Dokploy → app env, or local
`docker-compose.yml`):

```
MCP_API_TOKEN=<long random string>
MCP_USER_ID=<the user id this token represents — get from the users table>
```

Single-tenant cut: every MCP request is performed as `MCP_USER_ID`.
A per-user token table is a follow-up.

## Configure the MCP client

### Claude Desktop (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS)

```json
{
  "mcpServers": {
    "nosion": {
      "command": "node",
      "args": ["/abs/path/to/notion-page-clone/mcp/dist/server.js"],
      "env": {
        "NOSION_BASE_URL": "https://api-notion-page-clone.rahmanef.com",
        "NOSION_MCP_TOKEN": "<same value as MCP_API_TOKEN on the Convex deployment>"
      }
    }
  }
}
```

### Claude Code

```bash
claude mcp add nosion node /abs/path/to/notion-page-clone/mcp/dist/server.js \
  -e NOSION_BASE_URL=https://api-notion-page-clone.rahmanef.com \
  -e NOSION_MCP_TOKEN=<token>
```

## Tools

| name | purpose |
|---|---|
| `nosion-search` | Full-text search pages |
| `nosion-list-pages` | List pages, cursor pagination |
| `nosion-list-databases` | List all databases |
| `nosion-fetch` | Fetch any page (with blocks) or database by id |
| `nosion-list-rows` | List rows of a database (Notion page envelope per row) |
| `nosion-create-page` | Create page; `children` are Notion-shape blocks |
| `nosion-update-page` | Patch title/icon/cover/children |
| `nosion-move-page` | Reparent |
| `nosion-trash-page` | Soft-delete |
| `nosion-duplicate-page` | Deep clone, fresh ids |
| `nosion-create-database` | Create db |
| `nosion-update-database` | Patch db (title/icon/properties) |
| `nosion-create-row` | Insert row; `properties` is Notion-shape envelope map |
| `nosion-update-row` | Patch row properties |

Run `nosion-list-tools` over the HTTP endpoint directly to get the
live tool list (the standalone server hard-codes the same list in
`tools.ts` for offline JSON-Schema inspection).

## Direct HTTP usage

The MCP server is optional — you can also POST to `/mcp/v1` directly
from any HTTP client (curl, an LLM agent loop, a CI script):

```bash
curl https://api-notion-page-clone.rahmanef.com/mcp/v1 \
  -H "authorization: Bearer $NOSION_MCP_TOKEN" \
  -H "content-type: application/json" \
  -d '{"tool":"nosion-search","params":{"query":"meeting notes"}}'
```

Response shape: `{ ok: true, data: <Notion-shape JSON> }` or
`{ ok: false, error: { message: "..." } }`.

## Limits / future work

- **Single-tenant only**: one shared token = one user. Multi-tenant
  needs a `mcpTokens` table with hashed tokens + scopes.
- **Comments / users**: not exposed (no comments table backend yet).
- **Property schema patching**: `nosion-update-database properties`
  accepts the Nosion-shape array (not the Notion map) for now —
  schema-map patching is a follow-up.
- **No MCP resources/prompts**: tools-only surface for v1.
- **No streaming**: every tool call is a single round-trip.
