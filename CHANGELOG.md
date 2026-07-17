# Changelog

All notable changes to **open-silong** (formerly `notion-page-clone` /
`nosion`). Format inspired by
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); commits
follow [Conventional Commits](https://www.conventionalcommits.org/).

For granular per-commit history see `git log` or the per-wave audit
notes under `docs/audit/`.

## [Unreleased]

## [1.0.0] - 2026-07-17

First public open-source release. Consolidates the OSS-readiness prep, the
Obsidian-style knowledge graph, and a large performance + security + mobile
pass. Production-deployed on Vercel + Convex Cloud; typecheck + 1,110 tests +
build green.

### Added
- **Per-page share grants** — share a single page with a specific user (by
  email) as viewer or editor, independent of workspace membership; granted
  pages surface in the library "Shared" section. Bounded authz through two
  helpers (`canReadPage` / `requirePageWritable`) so an editor grant reaches
  page content only — never trash / delete / re-share / grant management.
- **Convex handler test suite** — a `convex-test` harness
  (`convex/testHarness.test.ts`) + 33 in-process handler tests covering pages
  CRUD + descendant cascade, database rows, the workspace membership gate
  (owner / non-member / viewer / unauth), public share slugs, and per-page
  grant authz.
- **Knowledge graph, Obsidian-style** (`/dashboard/graph`) — interactive
  cloud of pages, `[[wikilinks]]`, `@mentions`, `#tags`, and database rows,
  with backlinks and unresolved "ghost" nodes.
- **Architecture diagrams** — `docs/architecture/diagrams.md` (Mermaid:
  system, auth/authz flow, data model, slice graph, memory-graph pipeline),
  embedded in the README.
- **`TRADEMARKS.md`** — plain-language inspiration + trademark clarification
  for Notion & Obsidian (idea/expression distinction, nominative fair use,
  interoperability). Not legal advice.

### Changed
- **Partial Prerendering (Next Cache Components)** — the auth + realtime stack
  is scoped to an `(app)` route group and `cacheComponents` is enabled, so
  every route builds as a static shell + server-streamed data; public
  `/share`·`/site`·`/forms` no longer boot the Convex client.
- **Performance pass** — −~400 KB dashboard first-load (barrel→leaf import
  split), dropped the always-mounted global snapshot subscription,
  content-keyed structural sharing so a single edit re-renders one row,
  `getById` DTO (drops the ~8 KB `searchText` duplicate off the hot editor
  sub), admin analytics made non-reactive, and ~2.6 k lines of dead code +
  the orphaned slice-portability apparatus removed.
- **Mobile UX** — the AI console and the page action menu are now vaul
  bottom-sheet drawers (drag the handle to close); nested submenus portal
  into the drawer; the mobile topbar was decluttered (theme relocated into
  the page menu, redundant search hidden); submenus open centered.
- **Graph Forces rebuilt on the d3-force model** — inverse-square repulsion,
  degree-normalised link springs, `forceX/Y` centre gravity. (`8c95727`)
- **Graph Animate + controls** — alpha/temperature simulation with reheat +
  breathing, neighbourhood focus dimming, curved edges, cluster tinting,
  zoom-to-fit, persisted settings. (`f43df31`, `3bb3c92`)

### Fixed
- **`@`-mention rendered an extra line** — Tailwind Preflight forces
  `svg{display:block}`, which pushed the inline mention icon onto its own line
  above the label; the icon is now `display:inline-block`.
- **Nested trash / restore / permanently-delete threw in production** — the
  descendant BFS called `.paginate()` once per level, but Convex allows only
  one paginated query per function execution; each level now reads with an
  indexed `.take`.

Prior polish wave — root `CHANGELOG.md`, smoke-test golden flow doc, env
gitignore hardening, OSS readiness tick-off.

## 2026-05-23 — Production hardening (post-Phase 7)

### Fixed
- **Add View** silently failed after Phase 3 (`38f8243`): clicking
  "+ Add view" flashed but the new view never persisted. Root cause
  was a race in `useDbAdapter.addView`'s two-step compose
  (addView + updateView); the second call read stale `databaseMap`
  mid-callback and clobbered the first mutation's writes. Fix:
  `adapter.databases.addView` contract now accepts the full view
  config so the create completes in one round-trip. (`a5a950d`)
- **Duplicate Property** lost cloned `options` / `formulaExpression` /
  `rollupAggregate` for the same race-pattern reason. Added a
  dedicated `adapter.databases.duplicateProperty` method that
  delegates to the store's single-mutation clone. (this release)
- **PageEditor** mounted an inner `EditorComponentsProvider` with an
  empty `{}` fallback, shadowing `NotionAppProvider`'s bundled
  `DatabaseBlock` registry — block renderer showed a "not registered"
  stub even though the provider was mounted. Fix: merge outer
  registry into per-call overrides. (`bdcdcbf`)

### Added
- **Undo / Redo buttons** in the dashboard header, surfacing the
  existing workspace-level `useUndoRedo()` stack. Tooltip exposes
  ⌘Z / ⌘⇧Z hotkeys (Mac/Win-aware). Native contenteditable undo
  still handles in-block text edits. (`186617f`)
- **Error boundaries** for `/forms/:slug`, `/oauth/authorize`,
  `/site/:ws` — three public routes that previously bubbled render
  errors to the root boundary. (`5ae4356`)
- **301 / 308 redirects** from `nosion.rahmanef.com` and
  `notion-page-clone.rahmanef.com` to the canonical
  `silong.rahmanef.com`, preserving path + query. (`e1b69d7`)

## 2026-05-20 — Open-source pivot (v0.1.0-pre)

The first public OSS release prep. Project renamed
`notion-page-clone` → `open-silong`. Repo flipped license to MIT.
Brand becomes "Silong" for display surfaces.

### Phase 1 — OSS readiness foundation (commit `4c560f2`)

- Added `LICENSE` (MIT, 2026 Rahman Effendi and contributors)
- Rewrote `README.md` with 3-lane quick start (Convex Cloud /
  self-hosted Docker / public demo) and Notion-Labs disclaimer
- New `CONTRIBUTING.md` — dev setup, slice contract, PR conventions
- New `CODE_OF_CONDUCT.md` — Contributor Covenant 2.1
- New `SECURITY.md` — disclosure email + private advisory fallback
- New `DEPLOY.md` — Lane 1/2/3 + backup + migration + troubleshooting
- New `.env.example` — annotated per-lane sections
- New `.github/ISSUE_TEMPLATE/{bug_report,feature_request,config.yml}`
  + `.github/PULL_REQUEST_TEMPLATE.md`
- `package.json` — name = `open-silong`, license = MIT, author, repo,
  homepage, 10 keywords
- `next.config.mjs` — default URLs → `silong.rahmanef.com`
- `CLAUDE.md` — rebrand header + transition notes block

### Phase 2 — Surface rebrand Nosion → Silong (commit `cebf1d9`)

18 files touched. UI labels, OG image, sitemap, OAuth discovery,
share view, install prompt, export filenames.

Preserved for back-compat (deferred to coordinated re-key):
- localStorage keys (`nosion:iconRecents`, `nosion:theme-preset`, …)
- MCP server tool names (`nosion-search`, `nosion-list-pages`, …) +
  package `@nosion/mcp-server`
- Convex `INSTANCE_NAME` + backend domain
- Webhook header `X-Nosion-Signature`
- Code identifiers (`NosionCommandPalette`, `nosion://sync/`)

### Phase 3 — First-run demo seed (commit `1f012ad`)

- `convex/_shared/seedWelcomeContent.ts` — NEW. Three welcome pages
  auto-seeded into a freshly-created personal workspace:
  - 👋 Welcome to Silong (features overview)
  - ✨ Try the slash menu (interactive cheat sheet)
  - 🚀 Self-hosting & next steps (deploy lanes + repo links)
- `convex/_shared/workspace.ts` — `ensurePersonalWorkspace` adds
  `justCreated` flag; calls seed only on first creation.
- Opt-out: set `SILONG_DISABLE_SEED=1` on the Convex backend.

### Phase 5 — rr-side pointer update (rr commit `313777b`)

In the [rahmanef-resources-site](https://github.com/rahmanef63/resources)
monorepo:
- `notion-page-clone-os` template description clarifies "localStorage
  demo" + pointer to open-silong as the production stack
- `notion-shell` slice agentRecipe adds product-pointer block
- Two-surface model: rr = template marketplace + lifted slice;
  open-silong = production OSS Notion-inspired workspace

### rr-sync round 1 (rr commit `193f9f0`, this repo commit `abb17f6`)

- `theme-presets` slice lifted to rr (20 files; pure React + Tailwind
  v4 + next-themes)
- Tag `notion-like` added to 5 rr catalog entries: `command-menu`,
  `icon-picker`, `notion-blocks`, `notion-shell`, `theme-presets`
- `docs/rr-sync/lift-status.md` NEW — per-slice status + adapter
  contract for 11 blocked-pending-adapter slices

### Infra ops

- GitHub repo renamed `notion-page-clone` → `open-silong` (old URL
  redirects)
- Repo description + 10 topics set
- Local git remote updated to SSH `git@github.com:rahmanef63/open-silong.git`
- Dokploy domain `silong.rahmanef.com` configured (port 3000,
  https=true, letsencrypt)
- DNS A record for `silong.rahmanef.com` → `<YOUR_VPS_IP>`: pending
  user-side at DNS provider
- Legacy `nosion.rahmanef.com` kept as transition redirect

## Pre-OSS history (before 2026-05-20)

Feature roadmap and per-wave changelog lived at
`docs/notion-clone/ROADMAP.md` + `docs/notion-clone/SPRINT.md`.
Highlights:

- Multi-workspace (cycle 7) — per-user `userProfiles.activeWorkspaceId`,
  membership ledger, role-based access (owner / editor / viewer)
- Sharing — public share links with optional password + indexable toggle
- Comments + mentions + snapshots
- Wiki mode
- Import/export — JSON round-trip + Notion-compatible ZIP
- MCP — Notion-canonical JSON HTTP surface (ChatGPT + Claude Desktop +
  Cursor integration)
- AI agent + AI router
- BH/BI/BJ waves — notion-shell wrappers lifted to rr's
  `frontend/slices/notion-shell` (v0.4.0): SlashMenu, BlockActionsMenu,
  InsertBlockButton, inlineDecorator, NotionDatabase with 6 views, 10
  property cells, SortableBlockList, PageActionsMenu, ImageRenderer +
  EmbedRenderer

See `docs/audit/2026-05-20-rr-bh-bi-bj-completion.md` for the full
BH/BI/BJ provenance map.
