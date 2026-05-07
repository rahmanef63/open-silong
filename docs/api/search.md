# Search API — `convex/features/search/`

Convex full-text search over pages + databases. Powers Cmd+K /
SearchModal. Indexes: `pages.search_content` over `searchText`,
`databases.search_name` over `name`.

Source: `convex/features/search/{queries,mutations,lib,index}.ts`.

---

## Architecture

Convex's `searchIndex` is BM25-style ranked text retrieval. Indexed
fields:

- **pages.searchText** — denormalized concat of `title` + flattened
  block text (max 8 000 chars, see `lib.ts:MAX_LEN`)
- **databases.name** — single field

Both indexes filter by `userId` so cross-tenant leakage is prevented
at the query layer.

`searchText` is built via `buildSearchText(title, blocks)` from
`convex/features/search/lib.ts`:

```ts
function buildSearchText(title?: string, blocks?: unknown): string;
```

Walks `blocks[]` recursively (children, columns, tableRows) and
concatenates every `text` and `caption`. Whitespace-collapsed and
truncated to 8 KB.

---

## Queries

### `search({q: string, limit?: number}) → {pages, databases}`

Auth required (`getAuthUserId` — returns empty result if anonymous).

- `q.trim()` empty → empty result
- `limit` capped at **20**

Returns:
```ts
{
  pages: { id, title, icon, parentId, rowOfDatabaseId, updatedAt }[];
  databases: { id, name, icon, updatedAt }[];
}
```

**Title-match boost**: pages whose title (case-insensitive)
substring-matches `q` are sorted first; BM25 order preserved within
each group.

`databases.trashed` is post-filtered (the `trashed` field is
optional, so `eq("trashed", false)` doesn't match `undefined`).

---

## Mutations (internal)

### `backfillSearchText({userId})`

`convex/features/search/mutations.ts`. Internal mutation — only
callable from another Convex fn or via dashboard, never from the
client.

Iterates every page owned by `userId`, recomputes `searchText`,
patches if changed. Returns `{updated, total}`. Idempotent.

Triggered by:
- One-shot via Convex dashboard (when the search index format changes)
- Workspace JSON import (after restore)

Frontend doesn't call this — it's a maintenance op.

---

## Maintenance

### When to rebuild

`searchText` is denormalized — it's rebuilt on every page write where
text-bearing fields (`title` / `blocks`) change (see
`pages.update`, `pages.addBlock`, `pages.updateBlock`,
`pages.deleteBlock`).

If you change `flattenBlocksText` or `buildSearchText` semantics, run
`backfillSearchText` for every user (or accept that existing pages
are stale until they're next edited).

---

## Frontend integration

### `<CommandPalette>` (Cmd+K)

`frontend/slices/command-palette/components/CommandPalette.tsx`.
Calls `api["features/search/queries"].search` on debounced input.

### `<SearchModal>`

`frontend/slices/command-palette/components/SearchModal.tsx`. Standalone
search dialog (no command palette actions, just search results).

---

## Index limitations

- **Tokenization is whitespace-based** — no stemming, no fuzzy
  matching. "running" doesn't match "run". Workaround: pad common
  variants in `searchText` (not done).
- **Max indexed-field length: 8 KB**. Documents with extreme block
  counts have body text truncated. Title is always included
  (prepended to the body slice).
- **Filter fields**: only `userId` and `trashed` on pages; only
  `userId` on databases. Adding more filter fields requires a
  schema migration.

---

## Conventions

1. **Always rebuild searchText** when a page-level mutation touches
   `title` or `blocks`. Use `buildSearchText`.
2. **Style-only updates skip rebuild**. The `updateBlock` mutation
   has a `TEXT_FIELDS` allowlist for this.
3. **Filter by `userId`** in every search query. Public-share
   doesn't search — it's a direct id/slug lookup.
4. **Cap results** — server-side default 20, max 20.
5. **Don't add a new search index** without budgeting for re-index
   cost (every writer pays a small cost on every mutation).
