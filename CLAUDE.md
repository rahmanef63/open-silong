# Nosion — Claude / Agent Conventions

Block-based notes app. Next 16 (App Router) + React 19 + Convex 1.36 self-hosted.
Live: https://nosion.rahmanef.com · Convex: https://api-notion-page-clone.rahmanef.com

## Layout

- `app/` — App Router routes. Dashboard segments live under `/dashboard/*`.
  Pre-prefix legacy URLs (`/p/:id`, `/inbox`, `/settings`, …) redirect via
  `next.config.mjs` → `/dashboard/<same>`.
- `frontend/slices/{slug}/{components,views,hooks,lib}/` — feature slices.
  No `defineFeature()` / `config.ts` / `init.ts` shell here. Slices export
  via `index.ts` and are consumed directly by `app/` routes.
- `frontend/shared/{ui,lib,components,types}/` — primitives shared across
  slices.
  - `shared/components/icon-picker/` — DynamicIcon + IconPickerPopover
    (promoted from `slices/` 2026-05-11 because it was depended on by
    40+ files; lives in shared so it's available to consumers porting
    slices without dragging a peer slice).
  - `shared/lib/routes.ts` — `ROUTES` (relative, for `@/shared/lib/router`)
    and `ROUTES_ABS` (absolute, for `next/navigation`). Slices import
    named routes from here; raw `/dashboard/...` / `/p/...` literals
    are discouraged in slice code.
  - `shared/lib/router/` — portable router primitives. Wrap layouts
    with `<RouterProvider basename="/dashboard">`; slices use
    `useNavigate` / `useLocation` / `Link` / `Navigate` / `useParams`
    from `@/shared/lib/router`. Old `router-compat.tsx` is now a thin
    re-export. Downstream consumers can mount slices under any prefix
    by changing the `basename` prop.
  - `shared/providers/` — cross-cutting providers shared across
    slices. Currently exports `WorkspaceIOProvider` / `useWorkspaceIO`
    (moved out of `slices/workspace-io/` 2026-05-12; old slice index
    re-exports for back compat).
  - `shared/lib/store/hooks.ts` — per-domain selector hooks
    (`usePages`, `useDatabases`, `useBlocks`, `useWorkspaces`,
    `usePreferences`, …) over the monolithic `useStore()`. Opt-in;
    old `useStore()` keeps working. Re-exported from
    `@/shared/lib/store`.
- `convex/` — backend (queries/mutations/actions, schema, auth).
- `proxy.ts` — Next 16 request boundary (Convex auth optimistic gate, NOT
  the security boundary).

`audit-bp/scripts/audit-features.sh` does NOT apply here — it enforces the
Manef/SuperSpace canonical feature shell which Nosion does not adopt.
Ignore its grades. `audit-bp.sh` itself is fine.

## Navigation

- Inside dashboard: prefer `useNavigate` / `useLocation` / `Link` from
  `@/shared/lib/router`. The dashboard wraps with `<RouterProvider
  basename="/dashboard">` so basename stripping/prepending is automatic.
  Raw `useRouter()` + `usePathname()` from `next/navigation` is fine
  for one-offs — combine with `ROUTES_ABS.*` for those call-sites.
  See `AppSidebar.tsx`'s `path()` for an example.
- Outside dashboard (auth, marketing, /share): plain `next/link` + `useRouter`.
- Dashboard routes today: `/dashboard`, `/dashboard/library`,
  `/dashboard/admin`, `/dashboard/inbox`, `/dashboard/trash`,
  `/dashboard/settings`, `/dashboard/profile`, `/dashboard/p/:id`.
  `/admin` legacy URL redirects to `/dashboard/admin`.

## Deploy

- **Convex functions** — `convex-deploy.yml` GitHub Action runs
  `npx convex deploy --yes` with `CONVEX_SELF_HOSTED_*` env vars. For local
  pushes use `node si-coder/deploy.js` — raw `npx convex deploy` from a
  developer machine returns `BadAdminKey` against the self-hosted instance.
- **Frontend** — Dokploy app (`notion-page-clone-app-2tk1pq`) builds from
  main and serves via Traefik fronting the standalone Next image.
- **Backend** — `docker-compose.yml` runs Convex backend pinned to
  `5143-7adfedc`. Postgres-backed (`POSTGRES_URL` required). Ports bound
  to `127.0.0.1` only — Dokploy/Traefik fronts TLS.

After every commit, push to `origin/main` without asking. Always create
new commits, never amend.

## Feature flags / discipline

- Server Actions: every `"use server"` performs authn + authz; never return
  raw DB rows; use DTOs.
- Convex public fns: `args: { ... v.* }` validators are mandatory, plus a
  permission check before any DB write. Prefer
  `requireOwned(ctx, table, id)` from `convex/_shared/auth.ts` over the
  raw `getAuthUserId + db.get + userId-compare` triplet.
- Multi-workspace (cycle 7, session 1): every authed user has 1+
  workspaces. `convex/_shared/workspace.ts` is the gate —
  `getActiveWorkspaceMutation` / `readActiveWorkspace` resolve the
  per-user `userProfiles.activeWorkspaceId`; `requireWorkspaceMember`
  enforces membership. New entity rows MUST stamp `workspaceId` at
  insert (already done for pages, databases, db rows). Reads filter
  through `rowInActiveWorkspace(row, active, userId)` — explicit match
  OR row has no workspaceId AND active is the user's personal AND
  row.userId === viewer (legacy data passthrough). Sessions 2–5 will
  scope remaining tables (snapshots/recents/notifications/files/
  comments) and add URL slug routing + invites + per-page grants +
  presence. Roadmap: `docs/audit/2026-05-10-multiworkspace-roadmap.md`.
- Hot mutations gated through `rateLimit(ctx, userId, { scope, max,
  windowMs })` from `convex/_shared/rateLimit.ts`. Daily prune cron in
  `convex/maintenance.ts` keeps the backing table small.
- User-visible errors flow through `frontend/shared/lib/error.ts`
  (`sanitizeError` / `reportError`). Never show raw React or Convex
  stacks. Mutation guards live in
  `frontend/shared/lib/store/mutationGuard.ts`.
- Inline rich-text uses the **Slack model + WYSIWYG decoration**:
  `SelectionToolbar` wraps selections with markdown markers (`**…**`,
  `_…_`, `~~…~~`, `` `…` ``, `[label](url)`, `$math$`). The editor
  remains plain-text source-of-truth, but the contentEditable DOM is
  re-decorated after every input via
  `frontend/slices/editor/lib/inlineDecorator.ts` so bold/italic/strike/
  code/link render visually in-place (markers stay visible but dimmed).
  Caret is preserved across the pass via text-offset save/restore.
  IME-safe (skips during compositionstart/end). Read surfaces (public
  share, exports) parse via `frontend/shared/lib/inlineMd.tsx`.
  Relative `/path` links permitted (used for `@page` mentions); other
  schemes rejected.
- No raw `<a>` for internal routes; no raw `<img>` for hosted assets.
- `ResponsiveDialog`, `DateField`, `<FileUpload>` primitives live in
  `frontend/shared/`.

## Backup & restore

`Settings → Backup` and the unified `WorkspaceIODialog` (mounted via
`WorkspaceIOProvider`, surfaced from sidebar + page-action menu)
round-trip a JSON file. Export is client-side
(`frontend/shared/lib/markdown.ts:downloadFile` + `buildSelectionExport`
in `frontend/slices/workspace-io/lib/buildExport.ts`). Import goes
through `convex/import/workspace.ts:importFromJson` — zod-validated,
**five-phase** ID remap:
  1. Insert pages
  2. Insert databases
  3. Patch pages with parent / rowOfDb / blocks-with-remapped-refs
  4. Patch databases with remapped rowIds
  5. Insert snapshots with remapped pageIds (added cycle 6)

Snapshot/share-slug/wiki state IS now preserved across import (with
slug collision dropping); only `trashed` is filtered. Mention text in
blocks gets rewritten via `convex/_shared/idRemap.ts:rewriteMentions`.

## Audit / review

- Latest holistic audit: `docs/audit/2026-05-03-audit-bp.md` (full scope)
  + delta findings appended to that doc per cycle.
- Cache Components deferral: `docs/audit/cache-components.md`.
- Modularity / DRY / docs-freshness audit:
  `docs/audit/2026-05-09-modularity-audit.md`.
- Portability audit + status:
  `docs/audit/2026-05-11-portability.md` (findings) +
  `docs/audit/2026-05-12-portability-status.md` (10/10 closed).

## Slice portability

- Each `frontend/slices/<name>/` carries a `slice.manifest.json`
  declaring its `deps.shared` / `deps.slices` / `deps.convex`.
  Regenerate via `node scripts/generate-slice-manifests.mjs`.
- Port a slice with `node scripts/copy-slice.mjs <slice> --to <dest>` —
  recursively copies the slice + every declared dep, prints next-steps
  checklist (RouterProvider basename, env vars, schema deltas).

## Feature surfaces (per-slice index)

Every feature lives in `frontend/slices/<name>/` and exports through
`index.ts`. Per-slice docs live under `docs/api/`:

- `editor/` — block-based page editor, slash menu, WYSIWYG decorator,
  Notion-canonical block menu (search · turn-into · color · actions).
  Doc: `docs/api/blocks.md` + `docs/api/block-controls.md`.
- `databases/` — table/board/feed/calendar/gallery views, per-property
  config, column header menu (13 items). Doc: `docs/api/databases.md`.
- `library/` — `/dashboard/library` route. Recents/Favorites/Shared/
  Private/All sections + bulk action bar. Doc: `docs/api/library.md`.
- `admin-panel/` — `/dashboard/admin` route. Overview analytics, users
  table, audit log, templates, feedback. Doc: `docs/api/admin.md`.
- `workspace-io/` — unified Export/Import dialog, JSON + ZIP tabs.
  Doc: `docs/api/import-export.md`.
- `templates/` — gallery + AI prompt generator. Doc: `docs/api/templates.md`.
- `mcp/` (under `convex/`) — MCP HTTP surface for Notion-canonical JSON.
  Doc: `docs/api/mcp.md`.
- `comments`, `mentions`, `notifications`, `wiki`, `sharing`, `snapshots`,
  `trash`, `inbox`, `command-palette`, `ai-agent`, `search`, `files`,
  `feedback` — see slice index.ts + `docs/api/<name>.md` where present.
