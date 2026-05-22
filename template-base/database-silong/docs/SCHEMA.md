# Database Silong — SCHEMA

Reference for the Convex tables required by the database surface.

## Tables

| Table | Purpose | Required? |
|---|---|---|
| `databases` | Database container — properties, views, row pointer list | ✅ Required |
| `pages` | Row pages (DB rows are pages with `rowOfDatabaseId` set) + standalone pages | ✅ Required |
| `workspaces` | Multi-tenant container | ⚠️ Optional — drop for single-workspace mode |
| `workspaceMembers` | Membership + role | ⚠️ Optional — drop for single-workspace mode |
| `userProfiles` | Per-user settings (active workspace, display name) | ⚠️ Optional — drop for single-user mode |

See `convex/schema.database-silong.ts` for the full `defineTable` spec
of each (with indexes + search indexes).

## Property types stored in `databases.properties`

`properties` is `v.array(v.any())` for forward-compat. Each entry:

```ts
type Property = {
  id: string;
  name: string;
  type: PropertyType;
  options?: SelectOption[];     // select / multi_select / status
  formulaExpression?: string;   // formula
  rollupAggregate?: CalcKind;   // rollup
  relationDatabaseId?: string;  // relation
  relationInverseId?: string;   // relation (back-ref)
  // ... more depending on type
};
```

Supported `PropertyType` (16 total):

| Type | Stored value shape |
|---|---|
| `text` | `string` |
| `number` | `number` |
| `checkbox` | `boolean` |
| `select` | `{ id, name, color }` |
| `multi_select` | `{ id, name, color }[]` |
| `status` | `{ id, name, color, group? }` |
| `date` | `{ start: number, end?: number }` |
| `url` | `string` |
| `email` | `string` |
| `phone` | `string` |
| `files` | `{ url, name, type? }[]` |
| `person` | `{ id, name, icon? }[]` |
| `formula` | computed at read-time — no stored value |
| `created_time` | derived from `row.createdAt` |
| `last_edited_time` | derived from `row.updatedAt` |
| `unique_id` | derived from row position + `databases.uniqueIdCounter` |

Relation + rollup (deferred to v0.5 — need cross-DB context resolution).

## View types stored in `databases.views`

`views` is also `v.array(v.any())`. Each entry:

```ts
type DatabaseViewConfig = {
  id: string;
  name: string;
  type: DbView;
  sorts: DatabaseSort[];
  filters: DatabaseFilter[];
  search: string;
  groupBy?: string;        // board / list
  dateProp?: string;       // calendar / timeline
  startProp?: string;      // timeline
  endProp?: string;        // timeline
  chartKind?: "bar" | "line" | "area" | "pie" | "donut";
  chartXProp?: string;
  chartYProp?: string;
  chartAggregate?: CalcKind;
  formIsPublic?: boolean;
  formSlug?: string;
  formRequiredFields?: string[];
  formSuccessMessage?: string;
  // ... more depending on type
};
```

11 built-in `DbView`: `table | board | list | gallery | calendar | feed | chart | dashboard | form | map | timeline`

## Indexes (mandatory)

Every `defineTable(...)` MUST declare the indexes shipped in the
schema fragment. The Convex query handlers use them via
`.withIndex(...)` — without the index, those queries fall back to
`.collect()` which violates the open-silong "no bare `.collect()`"
rule.

| Index | Table | Purpose |
|---|---|---|
| `by_user` | `databases`, `pages`, `userProfiles` | Per-user list |
| `by_workspace` | `databases`, `pages`, `workspaceMembers` | Per-workspace list |
| `by_parent` | `pages` | Children of a page (sidebar tree) |
| `by_row_of_database` | `pages` | Rows of a database |
| `by_public_slug` | `pages` | Resolve `/share/<slug>` |
| `by_trashed_updated` | `databases`, `pages` | Daily trash purge cron |
| `by_has_public_form` | `databases` | Resolve public-form view |
| `by_workspace_user` | `workspaceMembers` | Membership check |
| `search_name` | `databases` | Full-text database search |
| `search_title` | `pages` | Full-text page search |

## Validators

All client-reachable mutations + queries declare `args: { v.* }`
validators (open-silong convention). Reference impl:

```ts
export const update = mutation({
  args: {
    dbId: v.id("databases"),
    patch: v.object({
      name: v.optional(v.string()),
      icon: v.optional(v.string()),
      properties: v.optional(v.array(v.any())),
      views: v.optional(v.array(v.any())),
      activeViewId: v.optional(v.string()),
      // ... etc
    }),
  },
  handler: async (ctx, args) => {
    await requireWorkspaceAccess(ctx, "databases", args.dbId, { write: true });
    await ctx.db.patch(args.dbId, { ...args.patch, updatedAt: Date.now() });
  },
});
```

## Authz semantics

Every write goes through `requireWorkspaceAccess(ctx, table, id, opts)`
from `convex/_shared/auth.ts`. It checks:

1. User is signed in (throws if not)
2. User owns the row OR is a member of the row's workspace
3. If `opts.write`, also checks role !== `viewer`

For single-user / single-workspace mode, swap with a noop:

```ts
// convex/_shared/auth.ts (consumer-side, minimal mode)
export async function requireWorkspaceAccess() { /* noop */ }
```

WARNING: only safe if your auth layer already gates the whole app.

## Migration paths

### From v0.3 to v0.4

`databases.hasPublicForm` added (denormalised). Backfill:

```ts
// convex/migrations/v04_has_public_form.ts
import { internalMutation } from "../_generated/server";
export const run = internalMutation(async (ctx) => {
  for await (const db of ctx.db.query("databases")) {
    const hasPublicForm = (db.views ?? []).some((v: any) => v.formIsPublic === true);
    await ctx.db.patch(db._id, { hasPublicForm });
  }
});
```

Run once: `npx convex run migrations/v04_has_public_form:run`.

### Adding workspace mode to a single-tenant install

1. Add `workspaces` + `workspaceMembers` + `userProfiles` tables to schema
2. Re-run `npx convex codegen`
3. Backfill: every existing user gets a default workspace, every
   existing row stamped with that workspace's id
4. See `convex/admin/backfillWorkspaceId.ts` reference impl in open-silong

## Where to look in open-silong reference

```
open-silong/convex/
├── schema.ts                       # full schema source-of-truth
├── databases.ts                    # 22 handlers (list/get/create/.../addRow/setRowValue)
├── pages.ts                        # 14 handlers (list/get/create/.../addBlock/updateBlock)
├── _shared/
│   ├── auth.ts                     # requireAuth / requireWorkspaceAccess
│   ├── workspace.ts                # readActiveWorkspace / databasesInActiveWorkspace
│   ├── rateLimit.ts                # rate limiting wrapper
│   ├── limits.ts                   # constants (per-user / per-workspace caps)
│   └── uid.ts                      # id generation helper
└── _generated/                     # NEVER commit — regenerated per deploy
```
