# Update from upstream — staying current with open-silong

This slice follows the **shadcn pattern**: you own the code. There is no `npm update` path (yet). When upstream ships a bugfix or feature you want, you pull it manually.

Four strategies below — pick by how customised your local copy is.

> Upstream: <https://github.com/rahmanef63/open-silong>  ·  source path inside the repo: `template-base/database-silong/`

---

## Strategy A — Git remote pull (recommended for clean installs)

**When to use**: you ran `npx rr add notion-database`, mounted the provider, and haven't customised the slice or convex handlers.

```bash
# One-time setup
git remote add open-silong https://github.com/rahmanef63/open-silong.git
git fetch open-silong main

# Diff your local handler against latest upstream
git diff open-silong/main:template-base/database-silong/convex/handlers/databases.ts -- convex/databases.ts

# Selectively pull a single file
git checkout open-silong/main -- convex/databases.ts

# Or pull the whole slice (overwrites your local — review the diff first!)
git checkout open-silong/main -- template-base/database-silong/
```

Watch for:
- **Auth differences** — upstream uses `requireWorkspaceMember`; your project may use a different gate. Re-apply your auth check after pulling.
- **Schema additions** — if upstream added a field, see "Schema migrations" below.
- **Adapter contract drift** — if the adapter signature changed, your custom `useXxxNotionAdapter()` may need updating.

---

## Strategy B — Pin to a known-good commit

**When to use**: stability matters more than latest features. You want predictable bumps.

```bash
# Find a commit you trust (release tag or known-good SHA)
git -C ../open-silong log --oneline template-base/database-silong/

# Pin to that SHA
git checkout open-silong/<sha> -- template-base/database-silong/

# Record the pin somewhere visible
echo "database-silong: open-silong@<sha>" >> VENDOR.md
```

Bump only after smoke-testing the new SHA in a branch. Pair with [Strategy A](#strategy-a--git-remote-pull-recommended-for-clean-installs) for the actual pull.

---

## Strategy C — Three-way merge for customised handlers

**When to use**: you've added local mutations, customised authz, or extended cell types.

Three-way merge against the **last upstream SHA you pulled** (the "base") plus the latest upstream (the "theirs"):

```bash
# 1. Save your current version
cp convex/databases.ts /tmp/databases.local.ts

# 2. Grab the base (last upstream SHA you synced)
git show <last-pulled-sha>:template-base/database-silong/convex/handlers/databases.ts > /tmp/databases.base.ts

# 3. Grab the new upstream
git show open-silong/main:template-base/database-silong/convex/handlers/databases.ts > /tmp/databases.theirs.ts

# 4. Three-way merge
git merge-file --stdout /tmp/databases.local.ts /tmp/databases.base.ts /tmp/databases.theirs.ts > convex/databases.ts

# 5. Resolve conflict markers manually
$EDITOR convex/databases.ts
```

For larger surfaces (`frontend/slices/notion-database/`) a manual file-by-file review is usually saner than `merge-file`.

---

## Strategy D — NPM package (future, v0.7+)

**When to use**: not yet — the slice is not published.

The roadmap (see [`ROADMAP.md`](./ROADMAP.md) §v0.7) lists publishing `@open-silong/notion-database` as a stretch goal. If/when it ships:

```bash
pnpm update @open-silong/notion-database
```

Until then, **manual copy via Strategies A/B/C is the only path**. Don't depend on this path for production planning.

---

## Schema migrations between versions

When upstream adds a denormalised field, your existing rows need a one-shot backfill. Backfill scripts live in open-silong at [`convex/admin/`](https://github.com/rahmanef63/open-silong/tree/main/convex/admin).

### Known migrations

| Field | Added in | Backfill required? | Reference script |
|---|---|---|---|
| `databases.hasPublicForm` | (upstream) | Yes — denormalised from views array | [`backfillHasPublicForm.ts`](https://github.com/rahmanef63/open-silong/blob/main/convex/admin/backfillHasPublicForm.ts) |
| `databases.workspaceId` | (multi-workspace cycle) | Yes — for full-mode only | [`backfillWorkspaceId.ts`](https://github.com/rahmanef63/open-silong/blob/main/convex/admin/backfillWorkspaceId.ts) |

### How to run a backfill

1. Copy the relevant script from upstream's `convex/admin/` into your own `convex/admin/`.
2. Adjust table names if your schema diverged.
3. Deploy: `npx convex deploy --yes` (or `node si-coder/deploy.js` for self-hosted).
4. Invoke once: `pnpm exec convex run admin/backfillHasPublicForm:run`.
5. Confirm idempotent — running twice should be a no-op.
6. Delete the script (or keep for next-time reference).

### Template for new backfills

If you add a denormalised field locally, use this shape (modelled on upstream):

```ts
// convex/admin/backfillMyField.ts
import { internalMutation } from "../_generated/server";

export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("databases").collect(); // OK in admin
    let updated = 0;
    for (const row of rows) {
      if (row.myField !== undefined) continue;
      await ctx.db.patch(row._id, { myField: deriveFrom(row) });
      updated++;
    }
    return { updated, total: rows.length };
  },
});
```

---

## Breaking changes log

Tracks every breaking change so you know whether a sync requires migration work.

| From → To | Breaking? | Migration |
|---|---|---|
| v0.4 → v0.5 | No — pure additive | None. Pull and go. |

Future entries land here as releases ship. **Anything not listed is not breaking.** If you hit a surprise breakage that's not documented, file an issue upstream.

---

## TL;DR — recipe

```bash
# First time
git remote add open-silong https://github.com/rahmanef63/open-silong.git

# Each sync
git fetch open-silong main
git log --oneline open-silong/main -- template-base/database-silong/ | head -20   # what changed
git diff HEAD open-silong/main -- template-base/database-silong/                   # review
git checkout open-silong/main -- template-base/database-silong/                    # apply
# Check Breaking changes log above, run backfills if listed.
pnpm typecheck && pnpm test
```
