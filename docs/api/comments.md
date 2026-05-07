# Comments API — `convex/features/comments/`

Page-level and block-level comments. Public viewers can read on shared
pages; only the page owner OR the comment author can mutate.

Source: `convex/features/comments/{queries,mutations}.ts`. Schema:
`convex/schema.ts:comments` with indexes `by_user`, `by_page`,
`by_block`.

---

## Schema shape

```ts
interface Comment {
  _id: Id<"comments">;
  userId: Id<"users">;       // author — owner only sees this
  pageId: string;
  blockId?: string;          // when set, this is a block-level comment
  text: string;              // ≤5 000 chars
  authorName: string;
  authorIcon: string;
  resolved: boolean;
  createdAt: number;
  updatedAt: number;
}
```

---

## Queries

### `listForPage({pageId}) → Comment[] | PublicCommentDTO[]`

- Owner: full rows (with `userId`)
- Public viewer (page is `isPublic`): sanitized DTO via `publicDto()`
  — drops `userId` so anonymous viewers can't deduce the author from
  the user table.
- Anyone else: empty array.

Capped at **500** comments per page. Higher counts truncate
silently — frontend should detect via `length === 500` and warn.

### `listForBlock({blockId, pageId}) → Comment[] | PublicCommentDTO[]`

Same auth rules as `listForPage`. Always pass `pageId` alongside
`blockId` — the parent page is the auth gate. Trusting `blockId`
alone would let an attacker enumerate block ids without knowing
their parent page.

Capped at 500 per block.

---

## Mutations

### `create({pageId, blockId?, text, authorName, authorIcon}) → Id<"comments">`

- Auth: `requireOwned(ctx, "pages", pageId)` — only the page owner
  can create. Public visitors **cannot** comment (cycle-2 closing
  of `DELTA-CONVEX-COMMENTS-PUBLIC-WRITE-001`).
- Rate limit: **30 / minute** (`scope: comments.create`).
- Length cap: 5 000 chars.

**Returns** the new comment id.

> If the product later wants public-write commenting (Notion-style
> "shared with comments"), add a `comments.allowPublicComment` flag
> on `pages` and gate the auth check on it. Frontend will need a
> dedicated anonymous DTO for the create mutation.

### `update({id, text})`

- Auth: author-only. `c.userId === userId` is required — page
  owners cannot edit someone else's comment, only delete/resolve it.
- Length cap: 5 000 chars.
- Touches `updatedAt`.

### `resolve({id, resolved: boolean})`

- Auth: author OR page owner (via `loadAndAuthorize`).
- Use `false` to reopen.

### `remove({id})`

- Auth: author OR page owner.
- Hard delete — no soft trash. Resolved comments shouldn't accumulate
  forever; if your UI shows a history, snapshot before delete.

---

## Page-owner moderation

`loadAndAuthorize(ctx, userId, commentId)` is the moderation gate:

```ts
async function loadAndAuthorize(ctx, userId, commentId) {
  const c = await ctx.db.get(commentId);
  if (!c) return null;
  if (c.userId === userId) return c;          // author
  const page = await ctx.db.get(c.pageId as Id<"pages">);
  if (page && page.userId === userId) return c; // page owner
  return null;
}
```

Used by `resolve` and `remove`. **Not** used by `update` —
content edits are author-only by design (page owners can delete a
bad comment but not rewrite its content under the author's name).

---

## Frontend integration

### Hook: `usePageComments(pageId)`

`frontend/slices/comments/hooks/useComments.ts`. Subscribes via
`useQuery(api["features/comments/queries"].listForPage)`. Returns
`{comments, openCount, create, update, resolve, remove}` plus
permission flags computed against the active user.

### Hook: `useBlockComments(blockId)`

Same shape, scoped to a block. `BlockControls` shows a comment count
badge sourced from `openCount`.

### `PageCommentsContext` provider

`frontend/slices/comments/lib/PageCommentsContext.tsx`. Lifts the
page-level comment state once so block comments can share the
subscription instead of querying per-block.

### Permission flags on `CommentItem`

`{canEdit, canDelete, canResolve}` are computed in the consumer and
passed in. Default rule:
- `canEdit`: author === current user
- `canDelete` / `canResolve`: author OR page owner

Public viewers get all three set to `false` (read-only surface).

---

## DTO discipline

`publicDto()` strips `userId`. **Don't** add new fields to `Comment`
without updating the DTO — every new field on the comment row should
be classified as owner-only or public-readable.

If the comment carries actor metadata you want exposed (e.g. a
`reactions: string[]` field for emoji reactions), put it OUTSIDE
`userId` so the DTO carries it.

---

## Conventions

1. **Always** check the parent page's auth — comments inherit it.
   Direct queries on `comments.by_user` would leak comments across
   pages.
2. **Capped queries** — 500 limit on listForPage / listForBlock.
   Don't `.collect()`.
3. **Length caps** — 5 000 char comment, enforced server-side.
4. **DTO discipline** — every public-share read goes through
   `publicDto()`.
5. **No notifications wired** — `inbox.create` is NOT triggered from
   `comments.create` today. Adding mention/comment-added notifications
   is a follow-up; see `BACKLOG.md §30.1`.
