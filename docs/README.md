# Nosion documentation

Live: https://nosion.rahmanef.com  ·  Convex: https://api-notion-page-clone.rahmanef.com

| Area | Doc | Audience |
|---|---|---|
| **API contract** | `api/README.md` (start here) | feature authors |
| | `api/conventions.md` | anyone adding a Convex fn |
| | `api/pages.md` | page CRUD + content |
| | `api/databases.md` | database schema, properties, views, rows |
| | `api/blocks.md` | block model, registry, RT, slash menu |
| | `api/comments.md` | page + block comments + page-owner moderation |
| | `api/snapshots.md` | version history |
| | `api/search.md` | full-text search infrastructure |
| | `api/files.md` | Convex storage upload flow |
| | `api/inbox.md` | notifications |
| | `api/auth.md` | requireAuth / requireOwned / requireAdmin / requireSuperAdmin |
| | `api/import-export.md` | JSON workspace round-trip + CSV + ZIP |
| | `api/notion-shape.md` | Notion-canonical JSON adapter (block / property / value bridge) |
| | `api/mcp.md` | Nosion MCP — Notion-shape HTTPS surface + stdio server |
| | `api/templates.md` | Template system — seed catalog, validate, instantiate, AI prompt generator |
| | `api/ai.md` | OpenRouter chat action |
| | `api/integration.md` | how a slice consumes pages/databases |
| **Types** | `types/domain.md` | Block / Page / Database / Property reference |
| **Roadmap** | `notion-clone/README.md` | scope + completion stats |
| | `notion-clone/BACKLOG.md` | full feature checklist |
| | `notion-clone/ROADMAP.md` | release phases |
| | `notion-clone/SPRINT.md` | active sprint |
| | `notion-clone/PROCESS.md` | DoD + ordering |
| **Audit** | `audit/2026-05-03-audit-bp.md` | full-stack security/perf audit + remediation cycles |
| | `audit/cache-components.md` | Cache Components migration plan |
| **Features** | `FEATURES.md` | high-level feature list |

## Reading order for a new contributor

1. `../CLAUDE.md` — agent conventions (layout, navigation, deploy)
2. `api/README.md` → `api/conventions.md`
3. `api/integration.md` (consume) OR `api/conventions.md` (extend)
4. The specific module doc you need (`pages.md`, `databases.md`, etc.)

## Reading order for a new feature design

1. `notion-clone/BACKLOG.md` — find the item to implement
2. `api/integration.md` — pick consumption path
3. `types/domain.md` — find the data shapes
4. `audit/2026-05-03-audit-bp.md` — understand the security baseline you must preserve

## Source-of-truth pointers

- Server: `convex/`
- Client: `frontend/slices/<slug>/` + `frontend/shared/`
- Routes: `app/`
- Types: `frontend/shared/types/domain.ts`
- Schema: `convex/schema.ts`

If a doc disagrees with the code, the code wins. File an issue and
fix the doc in the same commit.
