# API conventions

Canonical rules for all Convex functions in `convex/`. Distilled from
the audit of `pages.ts` + `databases.ts` + `snapshots.ts` +
`comments.ts` (cycles 1-5 of `docs/audit/2026-05-03-audit-bp.md`).

When you write a new public Convex fn, follow these. When you touch
an existing fn, drift TOWARD these rules — don't introduce new
inconsistencies.

---

## Frontend single-source modules (avoid copy-paste of metadata maps)

Companion to the convex/_shared section: client-side metadata/registry
modules every consumer should import instead of defining their own.

| module | what it gives you |
|---|---|
| `frontend/slices/databases/lib/propertyTypeMeta.ts` | `PROPERTY_TYPE_META`, `PROPERTY_TYPE_LABELS`, `PROPERTY_TYPE_ICONS`, `PROPERTY_TYPES`, `defaultPropName` |
| `frontend/slices/editor/blocks/placeholders.ts` | `TOP_LEVEL_PLACEHOLDERS`, `NESTED_PLACEHOLDERS` |
| `frontend/slices/databases/components/PropertyTypeIcon.tsx` | reusable `<PropertyTypeIcon type=>` element |

Adding a new property type? Add ONE entry in `PROPERTY_TYPE_META` and
every consumer (label, icon, default name, slash-group, change-type
submenu) updates automatically. Never define `Record<PropertyType, ...>`
in a component file.

---

## 0. Shared modules (use these, don't reinvent)

`convex/_shared/` is the source of truth for cross-fn primitives.
**Never** inline what already exists here:

| module | what it gives you |
|---|---|
| `auth.ts` | `requireAuth`, `requireOwned`, `requireAdmin*`, `requireSuperAdmin`, `actorEmail`, `ensureUserProfile` |
| `rateLimit.ts` | `rateLimit(ctx, userId, cfg)` — fixed-window counter |
| `limits.ts` | `RATE_LIMITS`, `CHAR_CAPS`, `COUNT_CAPS`, `RETENTION`, `FILE_SIZES`, `SHARE_SLUG_RE` constants |
| `pageTree.ts` | `collectDescendants(pages, rootId)` — page-tree walk, cycle-safe |
| `blocks.ts` | `regenBlockIdsDeep`, `regenAllBlockIds`, `walkBlocks`, `findDuplicateBlockId`, `topLevelDatabaseIds` |

When you find yourself writing a helper that operates on `pages` or
block trees, check `_shared/` first. If it doesn't exist, add it
there (with tests) instead of inline.

---

## 1. Identity & authorization

```ts
// always — never roll your own getAuthUserId + db.get + compare
const { userId, doc } = await requireOwned(ctx, "pages", pageId as Id<"pages">);

// for table-scoped writes that don't need the doc
const userId = await requireAuth(ctx);

// admin gates
const userId = await requireAdmin(ctx);            // mutations
const userId = await requireAdminQuery(ctx);       // queries
const userId = await requireSuperAdmin(ctx);       // role: "superadmin"
```

`requireOwned` is in `convex/_shared/auth.ts`. Tables it covers:
`pages`, `databases`, `snapshots`. To extend for a new table, add the
table name to its `OwnedTable` union and ensure the table has a
`userId` field.

**Anonymous-readable functions** (e.g. `pages.getPublicShare`):
no auth gate, but must return a sanitized DTO (no `userId`,
`searchText`, internal-only fields). Trash and private pages return
`null`, never throw.

---

## 2. Argument validators

```ts
args: {
  pageId: v.string(),                    // legacy: cast to Id in handler
  patch: v.object({                      // ALWAYS prefer object validators
    title: v.optional(v.string()),
    icon: v.optional(v.string()),
  }),
}
```

- **Bare strings**: legacy callers pass `pageId: v.string()`. New
  IDs may use `v.id("pages")` directly — Convex normalizes the
  literal at the boundary.
- **Object patches**: prefer explicit `v.object({...})` shapes when
  the patch is whitelisted (see `pages.update`).
- **`v.any()`**: acceptable for `blocks`, `rowProps`, `views`,
  `properties` (heterogeneous discriminated unions). Validate
  on the read side via DTO instead.
- **Length caps**: enforce in handler, not validator. e.g.
  `if (title.length > 200) throw new Error("Title too long");`.

---

## 3. Rate limiting

Hot mutations gate on `rateLimit()` from
`convex/_shared/rateLimit.ts`. **Always** reference a budget from
`RATE_LIMITS` in `_shared/limits.ts` — don't inline numbers:

```ts
const userId = await requireAuth(ctx);
await rateLimit(ctx, userId, RATE_LIMITS.pagesCreate);
```

Adding a new mutation? Add the budget to `RATE_LIMITS` first, then
reference it:

```ts
// convex/_shared/limits.ts
export const RATE_LIMITS = {
  // ...
  myFeatureBigOp: { scope: "myFeature.bigOp", max: 10, windowMs: 60_000 },
} as const;
```

Default scopes:

| call type | suggestion |
|---|---|
| Typed-on-keystroke (page update, block update) | none |
| User-initiated content create (page, comment, inbox) | 30-100 / minute |
| External cost (AI calls) | 20 / hour |
| Bulk imports | 3 / minute |
| Admin / super-admin tools | 10 / minute |

Rate-limit failures throw — let them propagate. The frontend
`reportError` produces a clean toast.

Daily prune cron (`convex/maintenance.pruneRateLimits`) clears
expired buckets. The `rateLimits` table never grows unbounded.

---

## 4. Return shapes

| operation | return |
|---|---|
| `create*` | `Id<"<table>">` (bare, NOT wrapped) |
| `update*` / `patch*` | `void` |
| state transitions (trash / restore / setPublic) | `void` |
| setters that confirm a normalized value | `{slug: string \| null}` / `{indexable: boolean}` |
| reads | the doc, DTO, or `null` |

Don't wrap returns gratuitously. Don't return a success boolean — if
the function returns, it succeeded.

---

## 5. Errors

```ts
// user-facing message
throw new Error("Slug must be 3-60 chars: lowercase letters, digits, hyphens");

// NEVER expose schema / internals in the message
// NEVER throw raw Convex SystemError or auth-system errors — wrap them
```

Frontend's `sanitizeError` (`frontend/shared/lib/error.ts`) keeps a
message allowlist and falls back to a generic "Something went wrong"
for unrecognized errors. To make your error reach the user, the
message must:

1. Be human-readable (no JSON, no stack trace text).
2. Not mention table names, function paths, or convex internals.
3. Stay short (≤120 chars).

If you need richer error context for telemetry, log via
`console.warn` / structured log — don't put it in the thrown message.

---

## 6. DTO discipline

Anonymous reads project a sanitized shape:

```ts
return {
  _id: doc._id,
  title: doc.title,
  // ... only public fields ...
  // NEVER: userId, searchText, rowProps, internal flags
};
```

Even owner reads should drop derived fields the caller doesn't need —
e.g. `pages.listMeta` excludes `blocks` because tree views never
render block content.

DTO shapes ARE the integration contract for downstream consumers.
Document them in `docs/api/<module>.md`.

---

## 7. Index discipline

Every workspace-scoped read uses an index, never `.collect()` over
the whole table:

```ts
// good
await ctx.db.query("pages").withIndex("by_user", q => q.eq("userId", userId)).collect();

// bad
await ctx.db.query("pages").collect();   // scans every user's data
```

Exception: anonymous queries that scan-and-filter must `.take(N)`
with a hard cap (`pages.listPublicForSitemap` takes 2 000 then
filters).

When you add a new query that filters by composite key (e.g.
`userId + parentId`), declare the index in `schema.ts`:

```ts
.index("by_user_parent", ["userId", "parentId"])
```

---

## 8. searchText / denormalized fields

The `pages.searchText` field powers Convex full-text search. It's a
denormalized concat of `title` + flattened block text, capped at the
search-index limit. Build via `buildSearchText(title, blocks)` from
`convex/features/search/lib.ts`.

**Rebuild only when text-bearing fields change**:

```ts
const TEXT_FIELDS = ["title", "blocks"]; // for page-level update
const touchesText = Object.keys(patch).some(k => TEXT_FIELDS.includes(k));
await ctx.db.patch(pageId, {
  ...patch,
  ...(touchesText ? { searchText: buildSearchText(nextTitle, nextBlocks) } : {}),
  updatedAt: Date.now(),
});
```

Style-only patches (color, bgColor, width, align, collapsed, font)
must NOT rebuild — color picker fires on every drag.

---

## 9. `updatedAt` discipline

Every mutation that writes touches `updatedAt: Date.now()`. The
sidebar / dashboard relies on this for "Recently updated" sort.

**Exception**: `pages.restore` touches `trashed: false` but does NOT
touch `updatedAt` — restoring a page shouldn't bump it to top of the
recent list. Whenever you write a similar exception, document it in
the fn's JSDoc.

---

## 10. Cron jobs

Daily crons in `convex/crons.ts`. Add new ones via:

```ts
// convex/crons.ts
crons.daily("purge stale trash", { hourUTC: 3, minuteUTC: 0 },
  internal.maintenance.purgeStaleTrash);
```

Implementation lives in `convex/maintenance.ts` as an
`internalMutation`. Internal mutations are not exposed to the
client — they exist only for crons + actions.

Today's crons:
- `pruneRateLimits` (daily) — drops expired `rateLimits` rows
- `purgeStaleTrash` (daily) — permanently deletes pages trashed > 30d

---

## 11. Generated types (`convex/_generated/api.d.ts`)

This repo's `convex/_generated/api.d.ts` is **hand-edited** because
the codegen step (`npx convex codegen`) requires `CONVEX_DEPLOYMENT`
env which is server-only (gated by `si-coder/deploy.js`). When you:

- **Add a new module file** under `convex/` — append the import +
  fullApi entry by hand.
- **Add a fn to an existing module** — no edit needed; the `typeof
  module` reference picks it up automatically.
- **Rename a module** — update the import + fullApi key.

The deploy CI re-runs `npx convex deploy --yes` which regenerates the
file on the server side. Local hand-edits are kept in sync as long
as you remember to add modules.

---

## 12. Test discipline

- Pure helpers (block tree, multi-move, formula engine, inline-md,
  parse helpers, error sanitizer, format helpers): vitest, co-located
  `*.test.ts` next to the file. 130 tests today.
- Convex functions: no server-side test harness. Rely on:
  1. Validator catching arg-shape errors at call time
  2. `requireOwned` catching auth misses
  3. Manual smoke after `npm run build`
- UI / E2E: not yet.

When in doubt, add a unit test for the pure helper that the mutation
delegates to (e.g. `multiMove` powers `moveTopLevelGroup` — test
multiMove, not the mutation that calls it).

---

## 13. Documentation expectations

Public Convex fns get a JSDoc block above the export:

```ts
/**
 * Brief one-line summary.
 *
 * Behavior notes (auth, side effects, rate limit).
 *
 * Invariants (what callers can rely on).
 */
export const myFn = mutation({ ... });
```

When you ship a non-trivial fn, also update the relevant
`docs/api/*.md` doc. The docs are the public contract — the source
file is the implementation.
