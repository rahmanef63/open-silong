# Database Silong — CONVEX BACKEND

Drop-in Convex handlers for the database surface. Two modes:

| Mode | When | What you ship |
|---|---|---|
| **Minimal** | Single-user prototype, demo, hobby project | Stubs noop authz; single synthetic user; no workspaces; no rate limit |
| **Full** | Multi-user production, multi-workspace, real-time | Requires `@convex-dev/auth` + workspaces tables + rate-limit infra |

## Install — minimal mode (fastest path)

```bash
# 1. Pick the helper variant
cp -r template-base/database-silong/convex/_shared/minimal/* convex/_shared/

# 2. Copy the handlers
cp template-base/database-silong/convex/handlers/databases.ts convex/databases.ts
cp template-base/database-silong/convex/handlers/pages.ts     convex/pages.ts

# 3. Merge the schema fragment
#    (see INSTALL.md Step 3)
cp template-base/database-silong/convex/schema.database-silong.ts convex/

# 4. Patch convex/schema.ts to spread databaseSilongTables
#    (manual edit — see schema.database-silong.ts header for example)

# 5. Regen codegen
npx convex codegen
```

Done. Minimal-mode handlers compile against your schema, every request
attributed to a synthetic `SYNTHETIC_USER_ID` from `_shared/auth.ts`.

> ⚠️ Minimal mode trusts the caller — there's NO ownership enforcement
> at the Convex layer. You MUST gate access at the route / middleware
> layer (e.g. NextAuth middleware blocking unauthenticated requests
> before they ever reach `/api/convex`).

## Install — full mode (production multi-user)

```bash
# 1. Install peer deps
pnpm add @convex-dev/auth

# 2. Wire @convex-dev/auth (see https://labs.convex.dev/auth)
#    Required tables: users, authAccounts, authSessions, etc.
#    Easiest: copy convex/auth.ts from open-silong reference.

# 3. Pick the full helper variant
cp -r template-base/database-silong/convex/_shared/full/* convex/_shared/

# 4. Copy handlers
cp template-base/database-silong/convex/handlers/databases.ts convex/databases.ts
cp template-base/database-silong/convex/handlers/pages.ts     convex/pages.ts

# 5. Merge schema (databases + pages + workspaces + workspaceMembers + userProfiles)
cp template-base/database-silong/convex/schema.database-silong.ts convex/
# Spread `databaseSilongTables` into your schema.ts

# 6. (Optional) Add rate-limit table for the rateLimit helper
#    See _shared/full/rateLimit.ts header — needs a `rateLimits` table.

# 7. Regen codegen + deploy
npx convex codegen
npx convex deploy
```

## What's in each mode

### `_shared/full/auth.ts`

- `requireAuth(ctx)` — throws `UNAUTHORISED` if not signed in; returns `userId`
- `requireOwned(ctx, table, id)` — throws if user doesn't own the row
- `requireWorkspaceAccess(ctx, table, id, opts)` — throws if user not in row's workspace; checks role for write
- `requireAdmin / requireAdminQuery / requireSuperAdmin` — admin gates
- `ensureUserProfile(ctx, userId)` — lazy-create on first access
- `actorEmail(ctx, userId)` — for audit log lookups

### `_shared/full/workspace.ts`

- `getActiveWorkspaceMutation(ctx, userId)` — resolves user's active workspace
- `readActiveWorkspace(ctx, userId)` — query variant
- `pagesInActiveWorkspace / databasesInActiveWorkspace` — scoped reads
- `requireWorkspaceMember` — membership check
- `rowInActiveWorkspace(row, active, viewerId)` — filter predicate
- `ensurePersonalWorkspace / listMyWorkspaces` — onboarding + switcher

### `_shared/full/rateLimit.ts`

- `rateLimit(ctx, userId, { scope, max, windowMs })` — per-user/scope throttle
- Backed by `rateLimits` table (add to schema OR use the noop minimal version)
- Daily prune cron lives in `convex/maintenance.ts` of open-silong reference

### Minimal stubs

`_shared/minimal/auth.ts` — every gate returns synthetic user. `requireOwned` / `requireWorkspaceAccess` resolve true.

`_shared/minimal/workspace.ts` — every workspace function returns null; row queries scope by `userId` index instead.

`_shared/minimal/rateLimit.ts` — pure noop.

Pure helpers (`limits.ts`, `uid.ts`, `markdown.ts`, `blocks.ts`,
`pageTree.ts`, `search.ts`) are identical between modes — no auth deps.

## Switching minimal → full later

1. Install `@convex-dev/auth` peer
2. Add `workspaces` + `workspaceMembers` + `userProfiles` tables (already in schema.database-silong.ts — uncomment if you dropped them)
3. Swap `_shared/` from minimal to full
4. Backfill existing rows: every existing user gets a default workspace, every existing row stamped with that workspace's id
5. Re-run codegen + deploy

Reference backfill: `convex/admin/backfillWorkspaceId.ts` in open-silong.

## Switching full → minimal (downgrading)

Rare. Required if you stop using multi-workspace mode entirely. Drop
the workspace stamping from existing rows + nullify `workspaceMembers`
table. Use the minimal stubs from then on. The handlers don't care —
both modes write the same row shape (just different scoping
enforcement).

## Adding webhooks

The template strips webhook emission from open-silong handlers for
portability. Add back if needed:

```ts
// convex/databases.ts (your copy)
import { internal } from "./_generated/api";

// inside create handler, after ctx.db.insert:
await ctx.scheduler.runAfter(0, internal.webhooks.deliver.run, {
  ownerId: userId,
  event: "db.created",
  payload: { dbId, name: args.name ?? "Untitled database" },
});
```

Requires a `convex/webhooks/deliver.ts` action that POSTs to your
endpoint subscribers. Reference impl: `convex/webhooks/deliver.ts` in
open-silong.

## Updating from upstream

When open-silong ships new handlers, pull the diff:

```bash
git remote add open-silong https://github.com/rahmanef63/open-silong.git
git fetch open-silong main

# Diff your local handlers against latest upstream
git diff open-silong/main:convex/databases.ts convex/databases.ts

# Apply selectively (review each hunk — your auth/workspace might differ)
git checkout open-silong/main -- convex/databases.ts convex/pages.ts

# If you customised, resolve conflicts manually
```

Stay on a known-good upstream commit if you want stability:

```bash
git checkout open-silong/3f4da51 -- convex/databases.ts convex/pages.ts
```

## File map

| Template path | Consumer path | Mode |
|---|---|---|
| `convex/handlers/databases.ts` | `convex/databases.ts` | both |
| `convex/handlers/pages.ts` | `convex/pages.ts` | both |
| `convex/_shared/full/*.ts` | `convex/_shared/*.ts` | full |
| `convex/_shared/minimal/*.ts` | `convex/_shared/*.ts` | minimal |
| `convex/schema.database-silong.ts` | `convex/schema.database-silong.ts` (then merge into `schema.ts`) | both |

## Common gotchas

- **`getAuthUserId is not a function`** — minimal mode handlers still
  import `getAuthUserId` from `@convex-dev/auth/server`. Either install
  the peer (`pnpm add @convex-dev/auth`) and never call it, OR replace
  the import in your copy with a stub: `const getAuthUserId = async () => null;`

- **`Cannot find module './_shared/auth'`** — you copied minimal/full
  helpers to the wrong location. They must land at `convex/_shared/`
  (NOT `convex/_shared/minimal/` etc).

- **TypeScript errors on `Id<"users">`** — your schema doesn't have a
  `users` table. Add one (full mode requires `@convex-dev/auth` which
  creates it; minimal mode can use `defineTable({})` placeholder).

- **All queries return `[]`** — minimal mode scopes by `userId` index
  but the synthetic id never wrote any rows. Either:
  - Use the same synthetic id everywhere (good — handlers do that)
  - Or wire your real auth + use `_shared/full/auth.ts`

- **Convex deploy timeout on first push** — codegen is slow on big
  schemas. Run `npx convex codegen` separately first, then `npx convex
  deploy`.
