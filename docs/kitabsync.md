# KitabSync Report — notion-page-clone

> Generated: 2026-05-15T05:09:24Z
> Run: audit refresh
> Kitab snapshot ref: de7411b

## Snapshot

| Metric | Value |
|---|---|
| Slices adopted (have `.kitab.json`) | 2 |
| Bootstrapped this run | 0 |
| Already had `.kitab.json` | 2 |
| Skipped (no kitab match) | 33 |

### Verdict breakdown

| Verdict | Count | Slices |
|---|---|---|
| in-sync | 0 | — |
| up-needed | 0 | — |
| down-needed | 0 | — |
| diverged | 2 | comments, command-menu |
| consumer-only | 33 | admin-panel, ai-agent, analytics, backlinks, block-selection, code-block, dashboard, database-cell-selection, database-csv, database-json, database-presets, database-templates, databases, editor, equation, feedback, files, inbox, library, mentions, mobile-nav, notifications, search, sharing, simple-table, snapshots, templates, theme-presets, trash, wiki, workspace-io, workspace-members, workspace-sidebar |
| kitab-only | 6 | convex-auth, mdx-blog, audit-log, full-width-toggle, broadcast-channel-sync, vector-search |

### Generalization breakdown

| Status | Count | Slices |
|---|---|---|
| portable | 0 | — |
| needs-adapter | 2 | comments, command-menu |
| consumer-locked | 0 | — |

## Slices detail

### `comments` — `diverged` · `needs-adapter`

- kitabVersion: `0.1.0`
- consumerVersion: `0.2.0`
- syncDirection: `down-only`
- lastPullAt: `null`
- lastPushAt: `null`
- Local path: `frontend/slices/comments/`
- Blockers (UP-sync gate):
  - `frontend/slices/comments/types/index.ts:3-4` — Comment shape hardcodes `pageId: string` + `blockId?: string`; kitab generic should expose `targetId` + optional `targetSubId` keyed by `targetKind`.
  - `frontend/slices/comments/lib/PageCommentsContext.tsx:46` — Convex API path `api["features/comments/queries"].listForPage` baked in; kitab should accept a fetcher fn or path prop.
  - `frontend/slices/comments/lib/PageCommentsContext.tsx:45` — `PageCommentsProvider` name + `useBlockComments(blockId)` hook tie domain language to page/block; rename to `CommentsProvider` + `useThreadComments(threadId)` for portability.
  - `frontend/slices/comments/components/BlockCommentsPopover.tsx` — file + component naming presumes block UI; kitab should provide a domain-neutral `ThreadPopover` with the consumer naming the host.
- Suggested action: refactor blockers behind props/adapters, then `npx rahman-resources update comments --apply` (DOWN), then `/rr-prep comments --fix` → `/rr-send comments` (UP)

### `command-menu` — `diverged` · `needs-adapter`

- kitabVersion: `0.1.0`
- consumerVersion: `0.2.0`
- syncDirection: `down-only`
- lastPullAt: `null`
- lastPushAt: `null`
- Local path: `frontend/slices/command-palette/`
- Blockers (UP-sync gate):
  - `frontend/slices/command-palette/components/CommandPalette.tsx:23` — palette consumes `pages, recents, databases, createPage, createDatabase` directly from the Nosion store; kitab should accept a generic `groups: CommandGroup[]` plus action handlers as props.
  - `frontend/slices/command-palette/components/CommandPalette.tsx:60` — placeholder copy `"Search pages, databases, or run a command…"` is consumer-domain text; kitab should accept a `placeholder` prop or i18n keys.
  - `frontend/slices/command-palette/components/palette/PagesGroups.tsx:60` — navigation hardcodes `ROUTES.database(d.id)` (consumer route helper); kitab should accept an `onNavigate(item)` callback so consumer owns route shape.
  - `frontend/slices/command-palette/components/palette/PresetGroup.tsx:13-14` — couples to `addBlock(pageId, after, type)` / `updateBlock(pageId, blockId, patch)` editor APIs; kitab should expose only renderless `CommandGroup` and `CommandItem` slots and let consumer wire effects.
  - `frontend/slices/command-palette/components/SearchModal.tsx:34` — DialogTitle literal `"Search workspace"` and surrounding placeholder `"Search pages and databases…"` are domain text; needs labels prop bag.
- Suggested action: refactor blockers behind props/adapters, then `npx rahman-resources update command-menu --apply` (DOWN), then `/rr-prep command-palette --fix` → `/rr-send command-palette` (UP)

## Aggregate suggested actions (priority order)

1. `comments` — diverged + needs-adapter (P0): extract `targetKind`/`targetId` props, rename Provider/hook, swap convex-path → fetcher prop, then `/rr-prep` + `/rr-send`.
2. `command-menu` — diverged + needs-adapter (P0): replace store-coupled props with generic `groups`/`onNavigate`/`labels` slots, then `/rr-prep` + `/rr-send`.
3. `convex-auth` — kitab-only (P3): repo already uses `@convex-dev/auth` directly in `convex/auth.ts`; promotion to kitab-aware slice unnecessary unless adapter divergence appears.
4. `vector-search` — kitab-only (P3): local `search` slice is text-only via `pages`/`databases` filters; adopt only when semantic-search backend is wired (out of current scope).
5. `audit-log` — kitab-only (P3): `admin-panel/components/audit-log/` exists as a subview; could be promoted to its own slice if audit reuse is desired across consumers.
6. `mdx-blog`, `full-width-toggle`, `broadcast-channel-sync` — kitab-only (P4): no current product surface for these; revisit if a marketing/content/multi-tab realtime feature lands.

## Run history (append-only)

| Date (UTC)              | Action                | Slices touched | Commit  | Author       |
|-------------------------|-----------------------|---------------:|---------|--------------|
| 2026-05-15T05:00:00Z    | initial bootstrap     |              2 | 88a7e43 | claude-code  |
| 2026-05-15T05:09:24Z    | audit refresh         |              2 | (this)  | claude-code  |
