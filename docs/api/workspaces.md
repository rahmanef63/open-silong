# Workspaces

Real multi-workspace landed in cycle 7 (session 1 of the 5-session
roadmap — see `docs/audit/2026-05-10-multiworkspace-roadmap.md`).

## Model

```
workspaces { ownerId, name, emoji, slug, isPersonal, createdAt }
workspaceMembers { workspaceId, userId, role: owner|editor|viewer, joinedAt }
userProfiles.activeWorkspaceId  // per-user active selection
```

Every user has exactly one `isPersonal: true` workspace, auto-created
on first authed write via `ensurePersonalWorkspace`. Additional
workspaces are user-created via `workspaces.create`.

## Public API

| Function                                | Kind     | Notes |
|-----------------------------------------|----------|-------|
| `workspaces.get`                        | query    | Legacy — returns active workspace doc |
| `workspaces.getActive`                  | query    | Active workspace + viewer's role |
| `workspaces.list`                       | query    | Every membership the viewer has |
| `workspaces.members({workspaceId})`     | query    | Member roster; emails visible to owner only |
| `workspaces.upsert({name, emoji})`      | mutation | Legacy — patches active workspace |
| `workspaces.create({name, emoji?})`     | mutation | New non-personal workspace; viewer becomes owner; auto-active |
| `workspaces.rename({workspaceId, name})`| mutation | Owner-only |
| `workspaces.setIcon({workspaceId, emoji})` | mutation | Owner-only |
| `workspaces.setActive({workspaceId})`   | mutation | Switch viewer's active workspace |
| `workspaces.remove({workspaceId})`      | mutation | Owner-only; refuses personal; resets active to personal |
| `workspaces.leave({workspaceId})`       | mutation | Member-only; owner must delete instead |
| `workspaces.ensureBootstrapped()`       | mutation | Idempotent first-load primer |
| `workspaces.backfillMyWorkspaceId()`    | mutation | Stamp workspaceId on viewer's legacy entity rows |

## Helpers (`convex/_shared/workspace.ts`)

- `slugifyWorkspaceName(name)` — url-safe slug.
- `ensurePersonalWorkspace(ctx, userId)` — mutation-only; idempotent.
- `getActiveWorkspaceMutation(ctx, userId)` — mutation-only; reads
  active or bootstraps personal.
- `readActiveWorkspace(ctx, userId)` — query-only; null if no
  workspace exists yet.
- `requireWorkspaceMember(ctx, workspaceId)` — auth gate; returns
  `{userId, workspace, role}`.
- `requireActiveWorkspaceWritable(ctx, userId)` — mutation-only.
  Returns active workspace; throws if viewer is read-only there.
  Use before any insert that stamps `workspaceId`.
- `pagesInActiveWorkspace(ctx, userId, active)` /
  `databasesInActiveWorkspace(...)` — primary read via
  `by_workspace`, plus a personal-workspace legacy fallback (rows
  pre-multi-workspace migration that never got `workspaceId`
  stamped, owned by the viewer).
- `listMyWorkspaces(ctx, userId)` — joined with role.
- `rowInActiveWorkspace(row, active, userId)` — transitional
  predicate. Legacy rows with no `workspaceId` resolve under the
  personal workspace. Still used by callers that filter post-fetch.

## Membership-aware auth (`convex/_shared/auth.ts`)

`requireWorkspaceAccess(ctx, table, id, { write? })` is the gate for
every page/database read or write that should be reachable by invited
members. Resolves the doc's `workspaceId`, looks up the viewer's
`workspaceMembers` row, and throws `"Tidak ditemukan"` for non-members
(no leak) or FORBIDDEN if `write: true` and role is `viewer`.

Legacy rows (no `workspaceId` stamped) fall back to owner-only access.

`requireOwned` is now reserved for genuinely owner-only state (workspace
rename / delete, mcpTokens). Every page/database mutation went through
the swap in session 1.6.

## Frontend store

```ts
const {
  workspace,            // active Workspace
  workspaces,           // every membership
  setActiveWorkspace,
  createWorkspace,
  deleteWorkspace,
  leaveWorkspace,
  updateWorkspace,      // legacy: patches name/emoji on active
} = useStore();
```

`StoreProvider` calls `workspaces.ensureBootstrapped` once per mount
when the active query returns null, so `pages.list` doesn't fire
against an unbootstrapped account.

## Surfaces

- Sidebar header: `frontend/slices/workspace-sidebar/components/WorkspaceSwitcher.tsx`
  (full switcher: list / switch / create / rename / delete / leave).
- Settings page: `app/dashboard/(account)/settings/WorkspacesSection.tsx`
  (row list mirroring the switcher).

## Invites (session 1.5)

Single-use base64url codes; 14-day expiry. Owner mints from
WorkspaceSwitcher → "Members & invites…" or Settings → Workspaces
row → Users icon. Recipient opens `/dashboard/invite/<code>` and
clicks Accept. New `workspaceInvites` table indexed by `by_code` +
`by_workspace`.

| Function                                       | Kind     | Notes |
|------------------------------------------------|----------|-------|
| `invites.create({workspaceId, role})`          | mutation | Owner-only; returns `{id, code}`. Rate-limited 30/min. |
| `invites.lookup({code})`                       | query    | Anonymous-readable; returns `{status, workspaceName?, workspaceEmoji?, role?}`. |
| `invites.accept({code})`                       | mutation | Idempotent; adds membership, marks `acceptedAt`, switches active. |
| `invites.revoke({inviteId})`                   | mutation | Owner-only; deletes pending invite. |
| `invites.listForWorkspace({workspaceId})`      | query    | Owner-only; pending + accepted history with expiry flag. |

`MembersDialog` (`frontend/slices/workspace-members/`) is the surface
— members roster (owner sees emails) + pending invites + role picker
(editor/viewer) + create/copy/revoke.

## Behavior audit (session 1.7)

Bug found: "Rename current…" in WorkspaceSwitcher patched the personal
workspace instead of whichever workspace was active. Root cause: the
frontend `updateWorkspace` helper in `shared/lib/store.tsx` called
`workspaces.upsert`, and `upsert` resolves the personal workspace via
`ensurePersonalWorkspace` regardless of viewer's active selection. So
renaming "Acme Team" silently rewrote the user's personal workspace's
name + emoji, and Acme stayed unchanged.

Fix: `updateWorkspace` now dispatches per-field to `workspaces.rename`
and `workspaces.setIcon` against `workspace.id` directly. The two
mutations carry the owner-only auth gate via `requireWorkspaceMember`,
so editors/viewers attempting to rename get a clean throw rather than
a silent partial write.

`workspaces.upsert` is left for back-compat (legacy single-workspace
callers might still call it). New code should never call it — it is
intentionally not exposed via the store anymore.

## Tenancy model (FK approach)

Pages and databases reference workspaces via a single FK:
`pages.workspaceId → workspaces._id` (and same on `databases`,
`snapshots`, `recents`, `notifications`, `files`). Membership lives
in a separate `workspaceMembers` join table.

Why direct FK rather than a per-entity ACL table:
- Convex `by_workspace` index makes workspace-scoped reads O(rows in
  workspace), not O(rows in app).
- Atomic writes — no two-table dance to insert a page.
- Cascades are obvious (delete a workspace → walk by_workspace once).
- Per-page sharing (session 4) can layer a `pageGrants` table on top
  WITHOUT changing the workspace FK; grants are an *addition* to
  workspace membership, not a replacement.

Membership-aware reads/writes go through
`requireWorkspaceAccess(ctx, table, id, {write?})` (session 1.6).
Legacy unstamped rows fall back to owner-only via `row.userId === viewer`
when the active workspace is the viewer's personal one.

## Portability into SuperSpace

Nosion will ship as a feature inside SuperSpace. To keep the workspace
interface portable, the contract on the frontend `Workspace` type is
deliberately minimal:

```ts
interface Workspace {
  id: string;          // string id (Convex id today; opaque to consumers)
  name: string;
  emoji: string;       // emoji|url|lucide:name — DynamicIcon already handles all 3
  slug?: string;       // url-safe; SuperSpace can choose to wrap this
  isPersonal?: boolean;
  role?: "owner" | "editor" | "viewer";
}
```

Rules to keep us portable:

1. **No Nosion-specific fields on `Workspace`** — e.g. don't put
   `defaultPageId` or `wikiRootId` here. Those belong on a per-app
   config row (`nosionWorkspaceConfig.workspaceId`) so SuperSpace can
   adopt the same `Workspace` shape for unrelated apps (Sheets,
   Whiteboard, etc.).
2. **Roles are an open union** — when SuperSpace introduces
   `admin` / `guest`, widen the union; existing checks
   (`role === "owner"`) keep working.
3. **`id` is opaque** — never branch on convex id format. SuperSpace
   may switch to UUIDv7 later.
4. **`emoji` is icon-agnostic** — `DynamicIcon` already accepts
   `<emoji>`, `lucide:<name>`, or `<https://...png>`. SuperSpace's
   icon system slots in without breaking the read path.
5. **Personal workspace is a Nosion convention** — SuperSpace might
   omit it or model it differently (e.g. a "Drafts" tenant). Treat
   `isPersonal` as advisory; never make it load-bearing for permission
   checks.
6. **Membership is the source of truth** — never trust `workspace.role`
   on the client to gate writes; always re-check on the server via
   `requireWorkspaceMember` / `requireWorkspaceAccess`.
7. **The store API is the abstraction surface**:
   `useStore() → { workspace, workspaces, setActiveWorkspace,
   createWorkspace, deleteWorkspace, leaveWorkspace, updateWorkspace }`.
   When porting, only this surface needs to be re-implemented against
   the SuperSpace tenancy SDK. The 50+ consumer components stay
   identical.
8. **No raw Convex ids in URLs yet** — slug routing (session 2) will
   give SuperSpace a stable URL contract (`/[wsSlug]/p/<pageId>`)
   that does not leak the convex id of the workspace.

The sidebar / settings switchers consume only the store contract above
— they will mount unchanged inside SuperSpace as long as the host
provides the same `useStore()` shape (or an adapter).

## What's NOT scoped yet (sessions 2+)

- URL slug routing (`/dashboard/[wsSlug]/...`).
- Snapshots / notifications / files / comments queries (filter only
  by `userId` today). Recents + pages + databases were scoped in
  sessions 1.5/1.6. These remaining tables still leak / hide content
  across invite-shared workspaces — must scope before they're
  real-world ready.
- Per-page collaborator grants (session 4).
- Presence cursors (session 5).
- "Created by" column in Library currently shows the viewer's name
  for every row — needs a per-row author lookup once members can
  share authorship.
