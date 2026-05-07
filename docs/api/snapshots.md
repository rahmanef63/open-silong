# Snapshots API — `convex/snapshots.ts`

Append-only version history. Snapshots capture page title + icon +
cover + blocks + rowProps. `restore` re-applies the snapshot's
content onto the live page WITHOUT deleting the snapshot — so a user
can branch/restore again.

Source: `convex/snapshots.ts`. Schema: `convex/schema.ts:snapshots`
with indexes `by_user`, `by_user_page`.

---

## Schema shape

```ts
interface Snapshot {
  _id: Id<"snapshots">;
  userId: Id<"users">;
  pageId: string;          // foreign key into `pages`
  authorId: Id<"users">;   // who took the snapshot (today: userId)
  authorName: string;      // display name at snapshot time
  takenAt: number;
  title: string;
  icon: string;
  cover: string | null;
  blocks: Block[];
  rowProps?: Record<string, PropertyValue>;
}
```

---

## Queries

### `listForPage({pageId}) → Snapshot[]`

Returns up to **50** most-recent snapshots for the given page,
ordered by `_creationTime` descending. Auth via `getAuthUserId` —
returns `[]` if not authenticated.

> No ownership check via `requireOwned` here because the read scope
> is filtered by the `by_user_page` index — only the caller's own
> snapshots are returned. Adding a stricter check would be defensive
> but currently superfluous.

### `listAll() → Snapshot[]`

Returns up to **500** most-recent snapshots across all the user's
pages. Used by an "All history" tab (not currently surfaced in UI;
kept for forward-compat).

---

## Mutations

### `create({pageId, authorName, takenAt, title, icon, cover, blocks, rowProps?}) → Id<"snapshots">`

- Auth: `requireOwned(ctx, "pages", pageId)`.
- No rate limit — frontend throttles via `useSnapshots` (snapshot
  every N edits / M minutes, debounced).

**Why no rate limit**: snapshot writes are throttled client-side and
size-bounded by `pages.blocks` cap. Server-side limiting would
double-protect but slow the legitimate periodic case.

### `restore({snapshotId})`

- Auth: `requireOwned(ctx, "snapshots", snapshotId)` AND
  `requireOwned(ctx, "pages", snap.pageId)` — both must be owned
  by the caller.
- Patches the live page with the snapshot's content. Does NOT delete
  the snapshot.
- Deep-clones blocks + rowProps via `JSON.parse(JSON.stringify(...))`
  so the page can diverge without mutating the snapshot.

**Side effects**:
- Touches `page.updatedAt`.
- DOES NOT take a fresh snapshot of the pre-restore state — call
  `create` from the frontend before `restore` if you want an undo
  point. (Most flows don't, since the user explicitly chose to
  restore.)

---

## Frontend integration

### Hook: `useSnapshots(authorName)`

`frontend/slices/snapshots/hooks/useSnapshots.ts`. Returns:

```ts
{
  snapshots: Snapshot[];          // all
  snapshotsForPage(id): Snapshot[];
  snapshotIfNeeded(pageId, before): void;  // throttled
  restoreSnapshot(snapId): Promise<void>;
}
```

`snapshotIfNeeded` is wired into `usePageActions` — every
mutation that changes content checks last-snapshot-time-for-this-page
and creates a new snapshot if > N minutes have passed.

### `<VersionHistory>` component

`frontend/slices/snapshots/components/VersionHistory.tsx`. Modal
viewer showing per-page snapshots with title diff highlights and a
"Restore" button. Opens via the History icon in the page editor
toolbar.

---

## Storage cost

Each snapshot duplicates the full `blocks` array. For a page with
1 000 blocks averaging 200 chars each, that's ~200 KB per snapshot.
Per-page take cap of 50 → ~10 MB / page upper bound.

If a workspace has 100 heavily-snapshotted pages, that's ~1 GB of
snapshot data. Convex pricing scales with storage; future hardening
should add:

- **Compression** — Convex supports binary docs but not transparent
  block compression yet
- **Eviction** — drop snapshots older than 90 days
- **Diff snapshots** — keep one full snapshot per N, deltas in between

None of this is implemented today. Document the cost so
downstream consumers understand the magnitude.

---

## Conventions

1. **Append-only** — never modify or delete a snapshot's content
   except by deleting the row entirely.
2. **Cascade on page delete** — `pages.permanentlyDelete` walks
   `snapshots.by_user_page` and deletes every snapshot referencing
   the page. Adding a new page-delete path? Mirror the cascade.
3. **Author identity** — `authorId` and `authorName` are captured at
   snapshot time. Future multi-user collab will use `authorId` to
   label snapshots in the UI; today it's always the page owner.
4. **No mutation snapshots** — block updates don't auto-snapshot.
   The `snapshotIfNeeded` heuristic is in the frontend hook. If a
   mutation should always snapshot (e.g. workspace import), call
   `snapshots.create` explicitly.
