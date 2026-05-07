# Inbox / notifications API — `convex/features/inbox/`

Per-user notifications. Today: a generic write surface that any
backend code can post to. Read surface drives the inbox panel in
the dashboard.

Source: `convex/features/inbox/{mutations,queries}.ts`. Schema:
`convex/schema.ts:notifications` with indexes `by_user`,
`by_user_unread`.

---

## Schema shape

```ts
interface Notification {
  _id: Id<"notifications">;
  userId: Id<"users">;     // recipient
  kind: "mention" | "comment" | "share" | "system" | "update";
  title: string;           // ≤200 chars
  body?: string;           // ≤4000 chars
  pageId?: string;
  blockId?: string;
  actorName?: string;      // who triggered it
  actorIcon?: string;
  read: boolean;
  createdAt: number;
}
```

The `kind` literal union is enforced at the validator level
(cycle-2 closing of `DELTA-CONVEX-VALIDATOR-INBOX-KIND-001`). Adding
a new kind requires:

1. Update the `v.union(v.literal(...))` in `mutations.ts`
2. Update the type definition above
3. Update the inbox UI to render the new kind's icon/title/body

---

## Queries

### `list() → Notification[]`

Auth required. Returns ALL notifications for the user, ordered by
`_creationTime` desc. **Uncapped** — relies on user-driven cleanup
(`remove`) and read-state filtering in the UI.

> Risk: high-volume users could accumulate thousands of rows. Future
> hardening: cap at 1 000, or auto-prune read+old via cron.

### `unreadCount() → number`

Auth required. Returns count of unread (`read: false`) notifications
via `by_user_unread` index.

Used for the unread badge on the inbox sidebar item. Subscribed
reactively — bumps as soon as any backend code creates a new
notification for the user.

---

## Mutations

### `create({kind, title, body?, pageId?, blockId?, actorName?, actorIcon?}) → Id<"notifications">`

Auth: `requireAuth` only — any authenticated user can write to
their OWN inbox. **You cannot write to another user's inbox** because
`userId` is set from `getAuthUserId(ctx)`, not from args.

Caps:
- `title.length ≤ 200`
- `body?.length ≤ 4000`

Rate limit: **100 / minute** (`scope: inbox.create`).

> If you want server-driven cross-user notifications (e.g. a comment
> notifies the page owner), the create call has to come from a
> backend code path that knows both the actor and the recipient. Add
> an `internalMutation` that creates a notification on behalf of a
> different user, called from the comment/share mutation server-side
> after auth has been established. The current `create` mutation
> intentionally cannot do this.

### `markRead({id})`

Auth: ownership (`note.userId === userId`). No-op if the row doesn't
belong to the caller (silent for existence-leak prevention).

### `markAllRead()`

Bulk-marks unread notifications as read via `by_user_unread` index.
Capped at **500 per call** to stay within the 4s mutation budget.
For >500 unread, a second call drains the rest.

### `remove({id})`

Hard delete. Same auth as `markRead`.

---

## Frontend integration

### Hook: `useInbox()`

`frontend/slices/inbox/`. Wraps `list` and `unreadCount`. Drives:

- Sidebar badge (unread count)
- Inbox panel (full list)
- Per-row actions (mark read / unread / remove)

### Mark-as-read on click

When a notification is clicked, the panel calls `markRead(id)` then
navigates to the linked page (if `pageId` is set) and scrolls to the
block (`#block-<blockId>` if set — see `blocks.md`).

---

## Cross-feature wiring (today + future)

Today's wiring:
- Nothing in the codebase posts to `inbox.create` automatically.
  The mutation is exposed for future cross-feature code.

Future wiring (per `BACKLOG.md §30.1`):
- `comments.create` → mention extraction → inbox.create for each mentioned user
- `pages.setPublic` → inbox.create for the owner ("X shared <page>")
- AI long-running actions → inbox.create on completion

When you wire one of these, follow the pattern: extract events
server-side (so the actor's auth is verified), then call
`inbox.create` with the explicit recipient via an internal mutation
(today's public mutation can only write to self).

---

## Conventions

1. **Recipient is implicit** — `userId` comes from auth, never
   from args. Cross-user notifications need an `internalMutation`
   variant.
2. **Kind is a closed literal union** — new kinds require code
   change, not a config flag.
3. **Length caps**: title 200, body 4000. Enforced server-side.
4. **Rate limit**: 100/min/user. If you find yourself hitting
   the limit, batch instead of looping `create`.
5. **No retention policy yet** — the table grows with usage. Add
   a prune cron in `convex/maintenance.ts` if it becomes a problem.
