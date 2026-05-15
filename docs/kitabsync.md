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
| up-needed | 1 | command-menu |
| down-needed | 0 | — |
| diverged | 1 | comments |
| consumer-only | 33 | admin-panel, ai-agent, analytics, backlinks, block-selection, code-block, dashboard, database-cell-selection, database-csv, database-json, database-presets, database-templates, databases, editor, equation, feedback, files, inbox, library, mentions, mobile-nav, notifications, search, sharing, simple-table, snapshots, templates, theme-presets, trash, wiki, workspace-io, workspace-members, workspace-sidebar |
| kitab-only | 6 | convex-auth, mdx-blog, audit-log, full-width-toggle, broadcast-channel-sync, vector-search |

### Generalization breakdown

| Status | Count | Slices |
|---|---|---|
| portable | 1 | command-menu |
| needs-adapter | 1 | comments |
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

### `command-menu` — `up-needed` · `portable`

- kitabVersion: `0.1.0`
- consumerVersion: `0.3.0`
- syncDirection: `bidirectional`
- lastPullAt: `null`
- lastPushAt: `null`
- Local path: `frontend/slices/command-palette/`
- Blockers: — (all 5 resolved in Wave N+3.3)
- Notes: Renderless `CommandPalette` consumes generic `CommandGroup[]` + label bag. Nosion-specific wiring isolated under `adapters/nosion.tsx` + `adapters/NosionCommandPalette.tsx` (excluded from kitab UP-sync surface). `SearchModal` accepts `labels?: SearchModalLabels` with defaults. Slice index re-exports the Nosion adapter as `CommandPalette` for back-compat with the dashboard mount.
- Suggested action: `/rr-prep command-palette --fix` (sanity check) → `/rr-send command-palette` (UP). Kitab maintainer accepts as `command-menu@0.2.0`.

## Aggregate suggested actions (priority order)

1. `comments` — diverged + needs-adapter (P0): extract `targetKind`/`targetId` props, rename Provider/hook, swap convex-path → fetcher prop, then `/rr-prep` + `/rr-send`. Gated on kitab `comments@0.2.0` contract bump (TargetRef + forbiddenWords + pathMap props per docs/contract-negotiations-2026-05-15.md).
2. ~~`command-menu` — diverged + needs-adapter (P0)~~ — DONE in Wave N+3.3 (this commit). Now `up-needed` + `portable`; ready for `/rr-send`.
3. `convex-auth` — kitab-only (P3): repo already uses `@convex-dev/auth` directly in `convex/auth.ts`; promotion to kitab-aware slice unnecessary unless adapter divergence appears.
4. `vector-search` — kitab-only (P3): local `search` slice is text-only via `pages`/`databases` filters; adopt only when semantic-search backend is wired (out of current scope).
5. `audit-log` — kitab-only (P3): `admin-panel/components/audit-log/` exists as a subview; could be promoted to its own slice if audit reuse is desired across consumers.
6. `mdx-blog`, `full-width-toggle`, `broadcast-channel-sync` — kitab-only (P4): no current product surface for these; revisit if a marketing/content/multi-tab realtime feature lands.

## Run history (append-only)

| Date (UTC)              | Action                | Slices touched | Commit  | Author       |
|-------------------------|-----------------------|---------------:|---------|--------------|
| 2026-05-15T05:00:00Z    | initial bootstrap     |              2 | 88a7e43 | claude-code  |
| 2026-05-15T05:09:24Z    | audit refresh         |              2 | 839ede5 | claude-code  |
| 2026-05-15T07:08:00Z    | command-menu refactor portable + bidirectional | 1 | (this) | claude-code  |
