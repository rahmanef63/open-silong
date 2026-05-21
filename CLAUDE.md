# open-silong — Claude / Agent Conventions

Open-source collaborative workspace (Notion-inspired). Next 16 (App Router) +
React 19 + Convex 1.36 self-hosted. License MIT.

Live: https://silong.rahmanef.com · Convex: https://api-silong.rahmanef.com ·
Repo: https://github.com/rahmanef63/open-silong

**Rebrand 2026-05-20**: project formerly known as `notion-page-clone` / `nosion`.
- Github repo renaming to `open-silong` (rahmanef63 account).
- Domain shifting `nosion.rahmanef.com` → `silong.rahmanef.com` (with redirect during transition).
- Convex backend domain shifting `api-silong.rahmanef.com` → `api-silong.rahmanef.com` (separate Dokploy ops).
- Internal code references to "Nosion" / "nosion" remain in many files; Phase 2 polish sweep will rebrand surface-by-surface. Backend `INSTANCE_NAME` stays `notion-page-clone` until a coordinated re-key (no urgency — internal id only).
- See `docs/rr-sync/2026-05-20-pivot-nosion-source-of-truth.md` for strategic rationale.

## Stack baseline

### Hard pins
- **Next ^16 + React ^19, Tailwind v4** — `proxy.ts` only, no `middleware.ts`.
  `experimental.cacheComponents` opt-in per page.
- **Convex self-hosted ^1.36** — Docker Compose on Dokploy node. Deploy via
  `node si-coder/deploy.js` (raw `npx convex deploy` → `BadAdminKey`).
- **Auth = `@convex-dev/auth`** — NO Clerk. Custom auth slices only when
  documented insufficient.

### Vertical slices
- Layout: `frontend/slices/<slug>/` (UI + types) + optional
  `convex/features/<slug>/` (schema + queries + mutations).
- **Barrel-only cross-slice imports.** `@/features/<slug>` ✅ —
  `@/features/foo/lib/internal-thing` ❌. Barrels = contract.
- **Props-driven portability.** No hardcoded URLs / env names / role enums
  inside slice code — pass via props or env-configured allowlist.

### Convex non-negotiables
- Every client-reachable `mutation()` / `query()` declares
  `args: { v.* }` validators. Missing = P0.
- **No bare `.collect()`** — use `.withIndex(...).take(N)` or paginate.
- Server-side authz **inside the handler** — `requireOwned` /
  `requireWorkspaceMember` from `convex/_shared/`. Route gates don't
  protect HTTP queries.
- Indexes mandatory for every `.filter` / `.order` path. Add via
  `defineTable(...).index(...)`.

### UI non-negotiables
- shadcn primitives only. Never raw `<button>` / `<dialog>` /
  `<input type=date|file>`. Wrap via `ResponsiveDialog` / `DateField` /
  `FileUpload` from `frontend/shared/`.
- Theme tokens only (`bg-background` / `text-foreground` / `border-border`).
  No hex.
- Mobile-first responsive — `md:` / `lg:` layered up from single-column.
- `next/link` for internal routes, `next/image` for hosted assets. No raw
  `<a href="/internal">` / `<img>`.
- `NEXT_PUBLIC_*` = exposed in client bundle. Never secrets / admin emails /
  API keys.

### Delivery
- Solo dev → push direct to `main`, NO PRs. Conventional commits +
  `Co-Authored-By: Claude …` footer. Dokploy webhook auto-builds.
- Local CI: `/sc-git ci --repo notion-page-clone` or pre-push hook —
  no GitHub Actions cloud minutes.

### Slice metadata

Each slice ships a `slice.manifest.json` declaring its shared/slices/
convex dependency list. Regenerate via
`node scripts/generate-slice-manifests.mjs`. Portability blockers
(hardcoded routes / role enums / table-name leaks) are tracked by
`node scripts/audit-portability.mjs`.

### MCP

`convex/mcp/` is a Notion-canonical JSON HTTP surface.

### Before writing code
1. Check if the change crosses a rule above — apply even if user didn't
   mention it. Call out which rule when proposing.
2. New feature → check if it should be a new slice under
   `frontend/slices/<slug>/` + `convex/features/<slug>/`.
3. After editing: `pnpm typecheck` + relevant `pnpm test` before commit.
4. Found rule-violating existing code? Flag it, but only fix if user asks
   (avoid scope creep).

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

`audit-bp/scripts/audit-features.sh` does NOT apply here — it enforces
a canonical feature-shell convention which open-silong does not adopt.
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
  `/dashboard/settings`, `/dashboard/profile`,
  `/dashboard/p/:id` (pages), `/dashboard/db/:id` (databases).
  `/admin` legacy URL redirects to `/dashboard/admin`.

## Pages vs databases (2026-05-12 refactor)

- **Pages** (`/dashboard/p/:id`) — have blocks. Rendered by `PageEditor`.
  Rows of a database are pages (with `rowOfDatabaseId` set).
- **Databases** (`/dashboard/db/:id`) — have rows + property schema +
  views. First-class routable entities. Rendered by `DatabasePage`
  which wraps `DatabaseBlock` with `fullPage`.
- Databases can be EMBEDDED in a page's block stream as a `database`
  block (inline view, all view types supported). The "Open as page"
  button on inline embeds navigates to `/db/:id`.
- The legacy `databaseHostFor` field on pages (a marker saying "this
  page is the canonical home of database X") is deprecated. PageEditor
  detects legacy host pages (marker present OR single-DB-block
  heuristic) and `router.replace(ROUTES.database(dbId))`. Data is
  not mutated — the marker is a redirect hint only. Pages whose
  referenced DB is missing/trashed skip the redirect so the user can
  recover the page.
- Do not create new pages with `databaseHostFor`. `DatabaseBlock`'s
  openAsPage navigates only.

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

## SSOT — rahman-shared adopted (2026-05-13, commit 8238969)

- `pnpm add rahman-shared@^0.2.0` — shared npm utils
- `frontend/shared/lib/utils.ts` is a 1-line re-export from `rahman-shared/lib/utils` — DO NOT inline cn back
- `next.config.mjs` has `transpilePackages: ["rahman-shared"]` (Turbopack TS hint, REQUIRED)
- 165 `@/shared/lib/utils` import sites continue working — only resolution chain changed
- Bump via `pnpm update rahman-shared`. Skill `/use-adopt-rahman-shared` codifies pattern

## Boundary-cast pattern for Convex FKs (2026-05-16)

Convex mutation/query args take branded ids: `pageId: v.id("pages")`,
`dbId: v.id("databases")`, `snapshotId: v.id("snapshots")`. Frontend
domain types (`Page.id`, `Database.id`) stay `string` for ergonomics —
the boundary cast lives in the data-access layer.

**Pattern** (top of any `shared/lib/store/*` or slice hook that calls
Convex mutations):

```ts
import type { Id } from "@convex/_generated/dataModel";

const asPageId = (s: string): Id<"pages"> => s as Id<"pages">;
const asDbId = (s: string): Id<"databases"> => s as Id<"databases">;

// call sites
mutUpdatePage({ pageId: asPageId(page.id), patch });
mutDeleteRow({ dbId: asDbId(dbId), rowPageId: asPageId(rowId) });
```

Helpers are intentionally per-file (not shared) so the cast surface is
visible and grep-able. Adding a new convex mutation call? Cast at the
call site, don't widen handler args back to `v.string()`.

**Audit before tightening a schema FIELD** (vs an arg). Run
`pnpm exec convex run admin/fkAudit:run` — confirms every stored
string parses as a valid `Id<TABLE>`. Zero `invalidFormat` ⇒ the
schema flip is safe. Orphans (`missingTarget > 0`) are fine, they
don't block the validator. See `convex/admin/fkAudit.ts`.

**Skip the cast** in `convex/mcp/internal.ts` — external HTTP input
where the defensive `v.string()` is intentional.

## Route SSOT — no `"/dashboard"` literals in slice code (2026-05-16)

- `frontend/shared/lib/routes.ts` exports `ROUTE_BASE = "/dashboard"`
  + `ROUTES` (relative, for `@/shared/lib/router`)
  + `ROUTES_ABS` (absolute, for `next/navigation`).
- Slices NEVER `const BASE = "/dashboard"`. Always import `ROUTE_BASE`
  or use a named route (`ROUTES.page(id)` / `ROUTES_ABS.page(id)`).
- Adding a new dashboard route? Edit `routes.ts` first, consume the
  named export everywhere.
- Migrating slices to a different host basename? Change `BASE` in
  `routes.ts` only.

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
- Database route refactor (pages vs databases split):
  `docs/audit/2026-05-12-database-route-refactor.md` — porting
  playbook + provider stack + gotchas for downstream agents.

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

---

## Slice portability + `notion` mega-slice

This project ships a `notion` mega-slice (`frontend/slices/notion/`)
that bundles editor + databases + templates + workspace-io + wrappers
as one drop-in for embedding inside other React projects. See
`docs/notion-mega-slice.md` for the API contract + generalisation
roadmap.

Track per-slice portability blockers with:

```bash
node scripts/audit-portability.mjs
```

Categories scanned: hardcoded `/dashboard` routes, role-enum literals,
`Id<"table">` leaks, `process.env.NEXT_PUBLIC_*` reads inside slice
code. Fix path: replace with `useNotionConfig().routes.*` /
`config.roles.*` / props at the call site.
