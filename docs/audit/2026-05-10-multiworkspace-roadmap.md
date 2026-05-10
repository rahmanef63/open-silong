# Multi-workspace roadmap — 2026-05-10

Five-session lift to true multi-workspace + collaboration. Patterned
after the SuperSpace / Manef workspace shape (workspaces table +
members ledger + active-workspace state). Session 1 ships in this
cycle; sessions 2–5 are scoped enough that each fits in one focused
session.

State after session 1 commits `0c2609a` + `df6ea2a`: foundation
landed (schema, helpers, scoped pages/db queries, switcher, settings
panel). Score: ~72 → ~74 (foundation only — most score lift unlocks
in sessions 2–4).

---

## Session 1 — Foundation (shipped)

**Schema**
- `workspaces` extended with `ownerId`, `slug`, `isPersonal`,
  `createdAt`. Indexes `by_owner`, `by_slug`. Legacy `userId` kept
  as alias.
- New `workspaceMembers` `{workspaceId, userId, role:owner|editor|viewer,
  invitedBy?, joinedAt}`. Indexes `by_workspace`, `by_user`,
  `by_user_workspace`, `by_workspace_user`.
- `userProfiles.activeWorkspaceId?` drives the per-user active
  selection.
- `pages|databases|snapshots|recents|notifications|files` gain
  optional `workspaceId` + `by_workspace*` indexes. Search indexes
  add `workspaceId` to `filterFields`.

**Helpers — `convex/_shared/workspace.ts`**
- `slugifyWorkspaceName(name)` — url-safe, falls back to "workspace".
- `ensurePersonalWorkspace(ctx, userId)` — idempotent; creates
  workspace + owner member + active selection.
- `getActiveWorkspaceMutation(ctx, userId)` — read active or
  bootstrap personal.
- `readActiveWorkspace(ctx, userId)` — query-only read.
- `requireWorkspaceMember(ctx, workspaceId)` — auth gate that
  returns the `{userId, workspace, role}` triple.
- `listMyWorkspaces(ctx, userId)` — joined with role.
- `rowInActiveWorkspace(row, active, userId)` — transitional
  predicate: explicit match OR row has no workspaceId AND active is
  the user's personal AND row.userId === viewer. Used by every
  scoped query so legacy data resolves under the personal workspace
  with no migration step required.

**API — `convex/workspaces.ts`**
- Queries: `get` (legacy), `getActive`, `list`, `members`.
- Mutations: `upsert` (legacy), `create`, `rename`, `setIcon`,
  `setActive`, `remove`, `leave`, `ensureBootstrapped`,
  `backfillMyWorkspaceId`.

**Scoping applied**
- `pages.list` / `pages.listMeta` filter through
  `rowInActiveWorkspace`.
- `pages.create` / `pages.duplicate` stamp workspaceId on insert.
- `databases.list` filters; `databases.create` and `databases.addRow`
  stamp workspaceId.
- `features/search/queries` filters both pages + databases hits.

**Frontend**
- `useStore()` exposes `workspaces[]`, `setActiveWorkspace`,
  `createWorkspace`, `deleteWorkspace`, `leaveWorkspace`. Calls
  `ensureBootstrapped` once per mount when `getActive` returns null.
- `WorkspaceSwitcher` (sidebar header): real list of memberships,
  switch / create / rename / delete / leave.
- Settings → Workspaces: `WorkspacesSection` mirrors the same
  surface as a row list. "Current workspace" sub-section keeps the
  legacy single-workspace rename/icon controls.

**What didn't ship in session 1**
- URL slug routing (`/dashboard/[wsSlug]/...`) — defer to session 2.
  Massive refactor: every NavLink, share permalink, and legacy
  redirect needs rework.
- Invite / join flow — session 3.
- Per-page collaborator permissions — session 4.
- Presence cursors — session 5.
- Snapshots / recents / notifications / files queries are not yet
  scoped. They still filter only by userId. Acceptable for session 1
  because workspaces only have one member (the owner) — cross-
  workspace leakage is impossible with current membership shape.
  Must scope before session 3 ships invites.

---

## Session 1.5 — Library polish + recents-per-ws + invites (shipped early)

User feedback after session 1 surfaced three gaps that were small
enough to fold into a 1.5 patch instead of waiting for session 2:

- **Recents broken after workspace switch**: the `recents` table held
  one row per user (no workspaceId). Switching workspaces showed
  recents from the previous workspace, then `byId.get` filtered them
  out → empty list. Fixed: `convex/recents.ts` now keys rows by
  (userId, workspaceId) via `findRecentRow` helper, with a fallback
  branch that adopts the legacy unscoped row under the personal
  workspace so users don't lose history. Cap lifted 8 → 20.

- **Library Databases tab had no checkbox / no CRUD**: rewrote
  `DatabasesTable` with Checkbox column + per-row dropdown (Rename
  via inline input, Change icon via IconPickerPopover, Move to
  trash). New `DbBulkActionBar` mirrors the page bulk bar (Trash N
  selected) when the Databases tab is active.

- **Icon picker DRY**: every workspace + database surface that used
  `WORKSPACE_EMOJIS` or a hardcoded `COMMON_EMOJI` row now uses the
  page editor's `IconPickerPopover` (emoji + lucide tabs + search +
  color row + twemoji toggle). Surfaces touched: WorkspaceSwitcher
  rename + create dialogs, WorkspacesSection create dialog,
  Settings → Workspace icon field, Library DatabasesTable rows.

Plus the **invite system** (originally session 3) shipped here too,
because the feedback explicitly asked for "share workspace like
Notion":

- New `workspaceInvites` table `{workspaceId, code, role:editor|viewer,
  invitedBy, createdAt, acceptedAt?, acceptedBy?}` w/ `by_code` +
  `by_workspace` indexes.
- `convex/invites.ts`: `create` (owner-only, returns base64url code),
  `lookup` (anonymous-readable preview), `accept` (idempotent;
  promotes to active workspace), `revoke` (owner-only),
  `listForWorkspace` (owner-only roster).
- `app/dashboard/invite/[code]/page.tsx` — accept landing with
  workspace preview + Accept/Decline buttons.
- New slice `frontend/slices/workspace-members/MembersDialog.tsx`
  surfaces members + pending invites + create/copy/revoke. Mounted
  from both the WorkspaceSwitcher dropdown ("Members & invites…")
  and the Settings → Workspaces row (Users icon).
- Single-use codes; 14-day expiry. Email send is intentionally NOT
  wired — owner copies the link and sends it through their own
  channel. SMTP wiring deferred until needed.

Score nudge: ~74 → ~76.

**Still owed before session 2**: scope snapshots/recents/notifications/
files/comments queries to active workspace (recents done; rest
pending) — invites are now live, so members of a shared workspace
will see those tables in cross-tenant ways until scoped.

---

## Session 2 — URL slug routing + remaining query scoping

**Goal:** every URL carries the workspace slug; every Convex query is
workspace-scoped.

**Scope**
- App Router restructure: `app/dashboard/[wsSlug]/...`. Move
  existing routes one level deeper.
- `next.config.mjs` redirects: `/dashboard` → `/dashboard/<personal>`,
  `/dashboard/X` → `/dashboard/<personal>/X` for legacy URLs.
- New `useWorkspaceRouteState()` hook: extracts `wsSlug` from
  `params`, looks up workspace by slug, sets it as active in Convex.
- Sidebar nav helpers (`AppSidebar.path()`) prefix with `/dashboard/<active.slug>`.
- Scope remaining tables: snapshots, recents, notifications, files,
  comments. Same `rowInActiveWorkspace` pattern.
- Share routes (`/share/<id>`) NOT prefixed — they're public + per-page.

**Files**
- `app/dashboard/[wsSlug]/...` (move + add layout that resolves slug).
- `frontend/shared/lib/router-compat.ts` (add `wsPath` helper).
- `convex/snapshots.ts`, `convex/recents.ts`,
  `convex/features/{inbox,files,comments}/queries.ts`.

**Risk:** the share-from-dashboard path. Make sure share dialog still
opens the public URL (`/share/<slug>`), not the prefixed dashboard
URL.

**Effort:** M-L. Single session if no scope creep.

---

## Session 3 — Invite + member management

**Goal:** workspace owners can invite collaborators by email; invitee
accepts via link, joins the membership ledger.

**Scope**
- Schema: `workspaceInvites {workspaceId, email, code, role,
  invitedBy, createdAt, acceptedAt?}`. Index `by_code`,
  `by_workspace`.
- Mutations:
  - `invites.send({workspaceId, email, role})` — generates
    base64url code, returns invite URL `/dashboard/invite/<code>`.
    Owner-only. Rate-limited.
  - `invites.accept({code})` — looks up invite, creates member row
    (idempotent if already a member), marks `acceptedAt`. Throws if
    code expired (>14 days) or already used.
  - `invites.revoke({inviteId})` — owner-only.
- Queries: `invites.listForWorkspace`, `invites.lookupByCode` (for
  the accept page to show workspace name).
- Workspace settings → Members tab: list + invite form +
  pending-invites list. Role dropdown per member (owner can promote/
  demote).
- Email send: behind a feature flag — for now invite UI shows the
  link to copy + share manually (no SMTP wiring). Keeps blast radius
  small.

**Files**
- `convex/schema.ts` (workspaceInvites table).
- `convex/workspaces/invites.ts` (new).
- `app/dashboard/invite/[code]/page.tsx` (accept landing).
- `frontend/slices/workspace-members/components/MembersPanel.tsx`
  (new).
- Wire MembersPanel into Settings under "Workspaces" or as own
  Section.

**Risk:** preventing rogue self-promotion. Role transitions must go
through `requireWorkspaceMember` + check viewer.role === "owner".

**Effort:** M. Single session.

---

## Session 4 — Per-page collaborator permissions

**Goal:** within a workspace, page authors can scope a page (and its
subtree) to specific members at view/comment/edit levels. Default:
inherit from workspace.

**Scope**
- Schema: `pageGrants {pageId, userId, level: view|comment|edit,
  grantedBy, createdAt}`. Index `by_page`, `by_user_page`.
- Helper `requireOwnedOrGranted(pageId, level)` — checks owner OR
  workspace owner OR explicit grant >= level.
- Replace every `requireOwned(ctx, "pages", id)` callsite with the
  new helper, threading the required level (most reads need "view";
  block edits need "edit").
- ShareDialog gains "People with access" tab — search workspace
  members, assign level.
- Sidebar "Shared with me" group surfaces pages where viewer has a
  grant but isn't the owner.

**Files**
- `convex/schema.ts` (pageGrants table).
- `convex/_shared/auth.ts` (`requireOwnedOrGranted`).
- `convex/pages.ts` (replace `requireOwned`).
- `frontend/slices/sharing/components/ShareDialog.tsx` (People tab).
- `frontend/slices/workspace-sidebar/components/AppSidebar.tsx`
  (Shared with me group).

**Risk:** every page read goes through the new helper. Performance:
keep grant lookup on the hot path O(1) via `by_user_page` index.

**Effort:** M-L. Single session if scope holds.

---

## Session 5 — Presence cursors + polish

**Goal:** see who else is viewing the same page in real-time; close
out the cycle with cleanup.

**Scope**
- Schema: `presence {pageId, userId, cursorAt, lastBeatAt}`. Index
  `by_page`. TTL: 30s (lazily pruned).
- Mutation `presence.heartbeat({pageId})` — upserts row; client
  pings every 10s while page is visible.
- Query `presence.forPage({pageId})` — returns active members with
  their name/icon.
- UI: avatar stack in PageEditor header (top-right). Hover → name.
- Cleanup: scope MCP tokens to active workspace
  (`mcpTokens.workspaceId`); migrate audit log target to include
  workspaceId; ensure share routes work cross-workspace.

**Files**
- `convex/schema.ts` (presence + mcpTokens.workspaceId).
- `convex/features/presence/{mutations,queries}.ts` (new).
- `frontend/slices/presence/` (new slice — Avatar stack +
  heartbeat hook).

**Risk:** chatty mutations from many users. Keep heartbeat at 10s,
not 1s. Convex billing on writes.

**Effort:** S-M. Single session.

---

## After session 5: ~80/100

Remaining gap to 90 is real-time collaborative editing
(ProseMirror/Yjs rebuild) — separate 4–6 week project.

## Backfill notes

`workspaces.backfillMyWorkspaceId` is exposed for self-service: any
authed user can run it once to stamp `workspaceId` on every legacy
row they own. Not strictly required because `rowInActiveWorkspace`
treats undefined-workspaceId rows owned by the personal-workspace
viewer as in-scope, but running it lets us drop the OR branch in
session 2.

Convex CLI:
```
npx convex run workspaces:backfillMyWorkspaceId
```

Or via the dashboard / a one-off page button if needed.

## Deploy

Both commits trigger the GitHub Action `convex-deploy.yml` which
runs `npx convex deploy` against the self-hosted instance. Frontend
auto-redeploys via Dokploy on `origin/main`. No new env vars.
