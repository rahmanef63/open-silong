# API documentation

Reference for downstream features building on Nosion's page + database
core. Read in order:

| Doc | Audience |
|---|---|
| `conventions.md` | Anyone adding a Convex fn — read first |
| `workspaces.md` | Multi-workspace foundation, switcher, member roles |
| `pages.md` | Reading / mutating page docs |
| `databases.md` | Reading / mutating database schema, properties, views, rows |
| `blocks.md` | Block model, registry, nesting rules, RT model, slash menu |
| `integration.md` | Building a new slice that consumes pages/databases |
| `../types/domain.md` | Frontend type reference (Block, Page, Database, View, Property, PropertyValue) |

Source of truth:

- Server: `convex/pages.ts`, `convex/databases.ts`, `convex/snapshots.ts`,
  `convex/recents.ts`, `convex/_shared/auth.ts`,
  `convex/_shared/rateLimit.ts`
- Client store: `frontend/shared/lib/store.tsx` + `store/pageActions.ts`
  + `store/databaseActions.ts`
- Domain types: `frontend/shared/types/domain.ts`
- Block tree: `frontend/slices/editor/lib/blockTree.ts`
- Inline RT: `frontend/shared/lib/inlineMd.tsx`

If a doc disagrees with the code, the code wins — file an issue and
fix the doc in the same commit.
