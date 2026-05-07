# Pages API — `convex/pages.ts`

Public Convex functions for the `pages` table. All callers run through
`@convex-dev/auth` — `getAuthUserId(ctx)` is the source of truth for
identity. Ownership gating is centralized in
`requireOwned(ctx, "pages", id)` (returns `{userId, doc}` or throws).

> **Stack note**: this is a self-hosted Convex deploy. Public mutations
> are reachable from any browser holding a valid auth token. Treat every
> arg as untrusted — validators must be tight, ownership must precede
> writes, hot mutations gate on `rateLimit()`.

Schema: `convex/schema.ts:pages`. Indexes: `by_user`, `by_user_parent`,
`by_share_slug`. Search index: `search_content` over `searchText`,
filtered by `userId`/`trashed`.

---

## Identity / DTO conventions

- **Public read DTO** (`getPublicShare`): omits `userId`, `searchText`,
  `rowProps`, `rowOfDatabaseId`. Anyone holding a share link is treated
  as anonymous.
- **Owner read** (`getById`, `listMeta`, `list`): full row visible to
  the owning user only.
- **Slim list DTO** (`listMeta`): excludes `blocks`, `searchText`,
  `rowProps`. Adds derived `databaseHostFor[]`, `blockCount`,
  `previewText`. Use this in sidebar / dashboard / palette — never
  mount a full-doc query for tree views.

---

## Queries

### `getPublicShare({id: string}) → SharedPageDTO | null`

Anonymous-readable. Resolves `id` as either a Convex page id (regex
`^[a-z0-9]{20,}$`) or a custom slug via `by_share_slug`. Returns DTO
only when `isPublic && !trashed`.

```ts
type SharedPageDTO = {
  _id: Id<"pages">;
  title: string; icon: string; cover: string | null;
  blocks: Block[];
  font?: PageFont; smallText?: boolean; fullWidth?: boolean;
  updatedAt: number;
  shareSlug?: string;
  shareIndexable: boolean; // false by default
};
```

**Caller**: `app/share/[id]/page.tsx` via `fetchQuery` +
`generateMetadata`. Page-level `React.cache(loadShare)` dedupes the
metadata + page handler hits within one request.

**Invariants**:
- Trashed and private pages return `null` (never throw).
- DTO never carries `userId` — preserves owner anonymity to viewers.

---

### `getById({id: string}) → Doc<"pages"> | null`

Owner-only full doc for the editor. Subscribe via `useQuery` so block
edits broadcast only this page (vs `list` which broadcasts everything).

**Behavior**:
- Returns `null` if not authenticated.
- Returns `null` if id doesn't resolve, or `doc.userId !== userId`.
  Silent failure — UI handles the null path with a 404.

---

### `list() → Doc<"pages">[]`

Owner-only full list (includes `blocks`). **Heavy** — every page write
broadcasts the entire list to subscribers. Prefer `listMeta` for tree /
sidebar / palette. Kept for legacy callers.

> **Convention**: any new caller should use `listMeta` unless it
> *needs* per-page blocks.

---

### `listMeta() → PageMeta[]`

Owner-only slim DTO (no `blocks`, no `searchText`, no `rowProps`).
Adds `databaseHostFor[]`, `blockCount`, `previewText`. Use this for
sidebar tree, dashboard cards, command-palette suggestions.

```ts
type PageMeta = {
  _id: Id<"pages">; _creationTime: number;
  userId: Id<"users">; parentId: string | null;
  title: string; icon: string; cover: string | null;
  favorite: boolean; trashed: boolean;
  isPublic?: boolean; shareSlug?: string;
  rowOfDatabaseId?: string;
  font?: PageFont; smallText?: boolean; fullWidth?: boolean; locked?: boolean;
  createdAt: number; updatedAt: number;
  databaseHostFor: string[]; // db ids for `database` blocks on this page
  blockCount: number;
  previewText: string;       // first text-bearing block, ≤120 chars
};
```

---

### `listPublicForSitemap() → {id, slug?, updatedAt}[]`

Anonymous-readable. Capped at 2 000 row scan / 1 000 returned. Filters
to `isPublic && !trashed && shareIndexable === true`. Used by
`app/sitemap.ts` (revalidate 3600s).

> Pages without `shareIndexable: true` never reach the sitemap, even
> when public. Reader still gets `noindex,nofollow` metadata from
> `generateMetadata` in `app/share/[id]/page.tsx`.

---

## Mutations — content

### `create({parentId: string | null, title?, icon?, rowOfDatabaseId?}) → Id<"pages">`

Rate limit: **60/min/user** (`scope: pages.create`). Inserts with one
empty `paragraph` block. Sets `searchText`. `rowOfDatabaseId` flips
the page into row mode (also seeds `rowProps: {}`).

**Returns**: bare `Id<"pages">` (NOT wrapped). Callers expect the id
directly (`const id = await create({...})`).

---

### `update({pageId, patch})`

Whitelisted patch — these fields only:

| field | type | notes |
|---|---|---|
| `title` | string | capped 200 chars |
| `icon` | string | unbounded (emoji / lucide / twemoji) |
| `cover` | string \| null | gradient css or url |
| `blocks` | Block[] | full replace; rebuilds `searchText` |
| `favorite` | boolean | |
| `parentId` | string \| null | move in tree |
| `font` / `smallText` / `fullWidth` / `locked` | typography flags | |
| `rowProps` | Record<string, PropertyValue> | only when `rowOfDatabaseId` set |
| `createdAt` | number | manual sort key (used by undo) |

Fields **explicitly excluded**: `userId`, `isPublic`, `trashed`,
`rowOfDatabaseId`, `shareSlug`, `shareIndexable`, `wiki`, `searchText`.
Use the carved-out mutations below.

**Auth**: `requireOwned`. **Rate limit**: none — typed-on-keystroke
saves are too hot for fixed-window. Frontend debounces in
`mutationGuard.ts`.

**Invariants**:
- `searchText` rebuilt only when `title` or `blocks` is in the patch.
- `updatedAt` always touched.

---

### `addBlock({pageId, afterIndex, type?, init?}) → string`

Inserts new block at `afterIndex + 1`. Default type `paragraph`. Rebuilds
`searchText`. Returns the new block id.

`init` is `v.any()` — frontend-driven. Convention: shape must conform
to `Block` (see `docs/types/domain.md`). Fields like `columns: [[]]`
for `columns2` are seeded by the slash menu.

> **Future hardening**: `init` should be a discriminated union on
> `Block.type`. Not done because the runtime cost of validating 18
> variants exceeds the protection benefit (frontend is the only caller).

---

### `updateBlock({pageId, blockId, patch})`

Patch merges over the matching block. Rebuilds `searchText` only when
the patch touches `text` / `type` / `lang` / `caption` (the
`TEXT_FIELDS` allowlist).

**Performance**: style-only patches (`color`, `bgColor`, `width`,
`align`, `collapsed`) skip the O(blocks) string concat — important
because color picker fires on every drag.

---

### `deleteBlock({pageId, blockId})`

Removes the block. If the page would become empty, seeds one
`paragraph` so the page is never blockless (cursor would have nowhere
to land).

---

### `reorderBlocks({pageId, orderedIds})`

Shuffles `blocks[]` to match `orderedIds` order. Blocks not in the
list are dropped silently. Used by dnd-kit drop handler. Does NOT
rebuild `searchText` (set of words unchanged).

---

## Mutations — sharing

### `setPublic({pageId, isPublic})`

Toggles `isPublic`. Carved out of `update` so the public flip cannot
piggyback on a routine content patch.

### `setShareSlug({pageId, slug}) → {slug: string | null}`

Slug regex: `^[a-z0-9](?:[a-z0-9-]{1,58}[a-z0-9])?$`. Lowercased on
write. Empty string clears. Throws on collision.

### `setShareIndexable({pageId, indexable: boolean}) → {indexable}`

Toggle search-engine indexability. Default `false`. Pages with
`indexable: false` get `<meta robots="noindex,nofollow">` and never
appear in the sitemap.

---

## Mutations — lifecycle

### `trash({pageId})`

Soft-delete `pageId` and **all descendants** (recursive `parentId`
walk over the user's owned pages). Sets `trashed: true`, touches
`updatedAt`. Cron `convex/maintenance.purgeStaleTrash` permanently
deletes after 30 days.

**Invariants**:
- Recurses only over pages owned by the same user — descendants of
  another user's pages (impossible today, future-proofed) are
  untouched.
- Database row pages get the same flag; if their host database is
  also owner, both are trashed.

### `restore({pageId})`

Inverse of `trash`. Restores the entire descendant set. Does NOT
re-parent orphans (parent might still be in the trash) — caller's
responsibility to re-parent in UI if needed.

### `permanentlyDelete({pageId})`

Recursively deletes the descendant tree AND every snapshot that
references those pages (`snapshots.by_user_page` index). One-way.

### `duplicate({pageId}) → Id<"pages">`

Deep-clones `blocks` and `rowProps` with fresh block ids. Title gets
" (copy)" suffix. Does NOT carry `isPublic` flag's truthiness onto
the new doc — only inherits the original's `isPublic` value (which
is currently kept in code; flagged in conventions as carry-or-clear
ambiguity; today: carries).

---

## Conventions for new functions

When you add a new public fn to `pages.ts`:

1. **Args**: prefer `pageId: v.string()` for now (legacy). Existing
   callers cast on the way in. New IDs may use `v.id("pages")` —
   safe because Convex normalizes the literal to its branded type.
2. **Auth**: always `requireOwned(ctx, "pages", id)` — never roll
   your own `getAuthUserId + db.get + compare`.
3. **Rate limit**: hot mutations (anything user-triggered with no
   debounce) gate on `rateLimit(ctx, userId, {scope, max, windowMs})`.
4. **searchText**: rebuild via `buildSearchText(title, blocks)` only
   when text-bearing fields change.
5. **`updatedAt`**: always touch on writes.
6. **Errors**: throw `new Error(userFacingMessage)` — message reaches
   the UI verbatim via `reportError`. Sanitize anything that might
   leak schema/internals.
7. **Returns**: `void` for state transitions (toggle/trash/restore),
   `Id` for inserts, `{slug}`/`{indexable}` for setters that confirm.
   Don't wrap unnecessarily.
8. **Carve-outs**: state transitions that should NOT be possible via
   the generic `update` patch (publish/trash/role) get their own
   mutation.
