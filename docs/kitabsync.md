# KitabSync Report — notion-page-clone

> Generated: 2026-05-15T08:15:00Z
> Run: post-edit bump
> Kitab snapshot ref: 659c7fb

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
| up-needed | 2 | comments, command-menu |
| down-needed | 0 | — |
| diverged | 0 | — |
| consumer-only | 33 | admin-panel, ai-agent, analytics, backlinks, block-selection, code-block, dashboard, database-cell-selection, database-csv, database-json, database-presets, database-templates, databases, editor, equation, feedback, files, inbox, library, mentions, mobile-nav, notifications, search, sharing, simple-table, snapshots, templates, theme-presets, trash, wiki, workspace-io, workspace-members, workspace-sidebar |
| kitab-only | 6 | convex-auth, mdx-blog, audit-log, full-width-toggle, broadcast-channel-sync, vector-search |

### Generalization breakdown

| Status | Count | Slices |
|---|---|---|
| portable | 2 | comments, command-menu |
| needs-adapter | 0 | — |
| consumer-locked | 0 | — |

## Slices detail

### `comments` — `up-needed` · `portable`

- kitabVersion: `0.1.0`
- consumerVersion: `0.3.0`
- syncDirection: `bidirectional`
- lastPullAt: `null`
- lastPushAt: `null`
- Local path: `frontend/slices/comments/`
- Blockers (UP-sync gate): _none_ — all 4 prior blockers resolved this run.
- Generalization changes:
  - `types/index.ts` — `Comment` now exposes `targetId` / `targetSubId` / `targetKind` (legacy `pageId` / `blockId` removed from the portable shape).
  - `lib/CommentsContext.tsx` (NEW, replaces `lib/PageCommentsContext.tsx`) — renderless `CommentsProvider({ targetId, targetKind?, comments, create, update, resolve, remove })`. Buckets a flat list by `targetSubId`. No Convex imports.
  - `useThreadComments(subId?)` replaces `useBlockComments(blockId)`. With no arg returns host-level (page-level) comments. `useComments()` is the new context-hook name (formerly `usePageComments`).
  - `components/ThreadPopover.tsx` (NEW, replaces `components/BlockCommentsPopover.tsx`) — domain-neutral popover. Accepts `threadId` + `viewer` + `buildCreateArgs(text)` so the consumer owns backend args + auth shape. Labels prop bag with defaults.
  - `adapters/nosion.tsx` (NEW, consumer-only) — `PageCommentsProvider` wires Convex `listForPage` fetcher + maps doc → portable Comment with `targetKind="page"`. `BlockCommentsPopover` wraps `ThreadPopover` with Nosion store viewer + `{pageId, blockId, ...}` create args. `useBlockComments` is a back-compat alias of `useThreadComments`. Excluded from kitab UP-sync.
  - `hooks/useComments.ts` — Convex-backed `useStandaloneComments` (no Provider needed), kept consumer-only for analytics.
  - `index.ts` — exports the renderless core (`CommentsProvider`, `useThreadComments`, `ThreadPopover`, `useCommentsContext`) plus back-compat aliases (`PageCommentsProvider`, `useBlockComments`, `BlockCommentsPopover`, `useComments`, `usePageComments`).
- Suggested action: `/rr-prep comments --fix` (sanity check) → `/rr-send comments` (UP). When ingested, kitab should drop the `adapters/` directory + `hooks/useComments.ts`.

### `command-menu` — `up-needed` · `portable`

- kitabVersion: `0.1.0`
- consumerVersion: `0.3.0`
- syncDirection: `bidirectional`
- lastPullAt: `null`
- lastPushAt: `null`
- Local path: `frontend/slices/command-palette/`
- Blockers: — (all 5 resolved in Wave N+3.3, commit 068709c)
- Notes: Renderless `CommandPalette` consumes generic `CommandGroup[]` + label bag. Nosion-specific wiring isolated under `adapters/nosion.tsx` + `adapters/NosionCommandPalette.tsx` (excluded from kitab UP-sync surface). `SearchModal` accepts `labels?: SearchModalLabels` with defaults. Slice index re-exports the Nosion adapter as `CommandPalette` for back-compat with the dashboard mount.
- Suggested action: `/rr-prep command-palette --fix` (sanity check) → `/rr-send command-palette` (UP). Kitab maintainer accepts as `command-menu@0.2.0`.

## Aggregate suggested actions (priority order)

1. `comments` — up-needed + portable (P1, NEW): `/rr-send comments` is unblocked. Renderless core + isolated adapter ready for kitab ingestion as `comments@0.2.0`.
2. `command-menu` — up-needed + portable (P1): `/rr-send command-palette` is unblocked.
3. `convex-auth` — kitab-only (P3): repo already uses `@convex-dev/auth` directly in `convex/auth.ts`; promotion to kitab-aware slice unnecessary unless adapter divergence appears.
4. `vector-search` — kitab-only (P3): local `search` slice is text-only via `pages`/`databases` filters; adopt only when semantic-search backend is wired (out of current scope).
5. `audit-log` — kitab-only (P3): `admin-panel/components/audit-log/` exists as a subview; could be promoted to its own slice if audit reuse is desired across consumers.
6. `mdx-blog`, `full-width-toggle`, `broadcast-channel-sync` — kitab-only (P4): no current product surface for these; revisit if a marketing/content/multi-tab realtime feature lands.

## Run history (append-only)

| Date (UTC)              | Action                | Slices touched | Commit  | Author       |
|-------------------------|-----------------------|---------------:|---------|--------------|
| 2026-05-15T05:00:00Z    | initial bootstrap     |              2 | 88a7e43 | claude-code  |
| 2026-05-15T05:09:24Z    | audit refresh         |              2 | 839ede5 | claude-code  |
| 2026-05-15T07:08:00Z    | command-menu refactor portable + bidirectional | 1 | 068709c | claude-code  |
| 2026-05-15T08:15:00Z    | comments refactor portable + bidirectional | 1 | (this) | claude-code  |
