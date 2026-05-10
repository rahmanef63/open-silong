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
- `listMyWorkspaces(ctx, userId)` — joined with role.
- `rowInActiveWorkspace(row, active, userId)` — transitional
  predicate. Legacy rows with no `workspaceId` resolve under the
  personal workspace.

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

## What's NOT scoped yet (sessions 2+)

- URL slug routing (`/dashboard/[wsSlug]/...`).
- Snapshots / notifications / files / comments queries (filter only
  by `userId` today). Recents was scoped in session 1.5. The rest
  are now leaking across invite-shared workspaces — must scope
  before invites are real-world ready.
- Per-page collaborator grants (session 4).
- Presence cursors (session 5).
