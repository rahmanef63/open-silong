# Database Silong — drop-in Notion-canonical database for any React project

shadcn-style installer pattern. You own the code. Backend swappable.

## TL;DR

```bash
npx rr add notion-database     # copy slice into your project
```

Mount provider in `app/layout.tsx`, add catch-all route at `app/db/[[...slug]]/page.tsx`, visit `/db`. Full notion database (11 views · 16 cells · formula engine · filters · sorts · public forms) — done.

## Two modes

### Demo (zero infra)

`useLocalStorageNotionAdapter()` — persists to browser localStorage. Perfect for portfolio mounts, design previews, or just trying out the UI.

### Production (Convex backend)

`useConvexNotionAdapter()` — real-time, multi-user, multi-workspace, durable. Requires a Convex deployment (cloud or self-hosted via Docker Compose).

## What's in this template

| File | Purpose |
|---|---|
| `app/db/[[...slug]]/page.tsx` | Catch-all Next 16 route — single file routes the whole UX |
| `convex/schema.database-silong.ts` | Schema fragment — merge into your `schema.ts` |
| `docs/INSTALL.md` | Step-by-step setup |
| `docs/WIRING.md` | Provider mount + adapter selection |
| `docs/PROMPT.md` | AI agent integration prompt (drop into `.claude/`) |
| `docs/SCHEMA.md` | Table reference + property + view shapes |
| `docs/TROUBLESHOOT.md` | Common errors + fixes |

## Architecture summary

```
Consumer project
└── app/layout.tsx
    └── <NotionAppProvider adapter={useXxxNotionAdapter()}>
        └── app/db/[[...slug]]/page.tsx (catch-all)
            └── <NotionDatabase dbId={...} />
                └── useNotionAdapter().databases.useOne(dbId)
                    └── Convex query / localStorage read / your impl
```

The slice ships UI. The adapter is the only swap point.

## Feature matrix (v0.4)

| Capability | Status |
|---|---|
| 11 view types (table, board, list, gallery, calendar, feed, chart, dashboard, form, map, timeline) | ✅ |
| 16 property cell types (text, number, checkbox, select, multi_select, status, date, url, email, phone, files, person, formula, created_time, last_edited_time, unique_id) | ✅ |
| Filter builder | ✅ |
| Sort builder | ✅ |
| Per-column menu (rename / type / duplicate / hide / delete) | ✅ |
| Formula engine (`={{prop}} + 1`) | ✅ |
| Public form view (submit-to-create) | ✅ |
| Drag-to-reorder rows / properties | ✅ |
| Search index (Convex `searchIndex`) | ✅ Convex mode only |
| Multi-workspace tenancy | ✅ Convex mode only |
| Relation property (cross-DB lookup) | ⏳ deferred to v0.5 |
| Rollup property (aggregate over relation) | ⏳ deferred to v0.5 |
| Real-time multi-user | ✅ Convex mode only |
| Public sharing via `/share/<slug>` | ✅ Convex mode only |
| Snapshots (version history) | ⏳ requires snapshots adapter |

## Customisation surface

- **Mount path** — `config.routes.basePath`
- **Internal link templates** — `config.routes.{page, database}`
- **Feature flags** — `config.features.{ai, sharing, snapshots}`
- **i18n strings** — `config.i18n.*`
- **Role enums** — `config.roles.{editor, viewer}`
- **Component overrides** — `components.{DatabaseBlock, PropertyCell, BlockEditor}`

All optional. Sensible defaults match open-silong.

## License

MIT.
