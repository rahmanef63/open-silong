# KitabSync Report — notion-page-clone

> Generated: 2026-05-15T12:15:00Z
> Run: DOWN-sync apply (kitab `comments@0.2.0` adopted)
> Kitab snapshot ref: comments@0.2.0

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
| in-sync | 1 | comments |
| up-needed | 1 | command-menu |
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

### `comments` — `in-sync` · `portable`

- kitabVersion: `0.2.0`
- consumerVersion: `0.2.0`
- syncDirection: `bidirectional`
- lastPullAt: `2026-05-15`
- lastPushAt: `null`
- Local path: `frontend/slices/comments/`
- Blockers (UP-sync gate): _none_ — adopts kitab v0.2.0 polymorphic `TargetRef`.
- Generalization changes (DOWN-sync to kitab v0.2.0):
  - `types/index.ts` — `TargetRef = { kind, id, subId? }` polymorphic anchor; `Comment.target: TargetRef`. Replaces v0.1.0 flat `targetId` / `targetSubId` / `targetKind` field trio. No `pageId` / `blockId` / `targetType` literals in the portable shape.
  - `hooks/useCommentsCore.ts` (NEW) — kitab v0.2.0 props-driven hook `useCommentsCore(bindings, opts)` matching the contract `requiredProps: [target, bindings, forbiddenWords, pathMap]`. Built-in `forbiddenWords` guard at create-time. Renamed locally from kitab `useComments` to avoid colliding with the back-compat consumer alias.
  - `components/CommentsAnchor.tsx` (NEW) — kitab v0.2.0 renderless anchor with `pathMap?` deep-link prop. Render-prop signature `({ isLoading, openCount, totalCount, href }) => ReactNode`.
  - `components/CommentsThread.tsx` (NEW) — kitab v0.2.0 renderless thread wrapper. Render-prop exposes `{ isLoading, items, openCount, create, update, resolve, remove }` to the consumer skin.
  - `lib/CommentsContext.tsx` — context-provider variant retained for the editor mount. `target: TargetRef` instead of split `targetId` / `targetKind` props. Buckets comments by `target.subId`. No Convex imports.
  - `components/ThreadPopover.tsx` — domain-neutral popover (no portable-surface forbidden-term references; doc comment scrubbed of `pageId` / `blockId` example).
  - `adapters/nosion.tsx` — translates Convex `comments` rows into `Comment.target = { kind: "page", id: pageId, subId: blockId }`. Hosts `PageCommentsProvider` / `BlockCommentsPopover` / `useBlockComments`. CONSUMER-only, excluded from kitab UP-sync.
  - `adapters/nosionStandalone.ts` (moved from `hooks/useComments.ts`) — Convex-backed `useStandaloneComments` for analytics. CONSUMER-only.
  - `adapters/PageCommentsPanel.tsx` (moved from `components/`) — Nosion-store-bound page-level panel. CONSUMER-only.
  - `index.ts` — exports kitab v0.2.0 portable surface (`useCommentsCore`, `CommentsAnchor`, `CommentsThread`, `CommentsBindings`, `TargetRef`, `Comment`) alongside the existing renderless core (`CommentsProvider`, `useThreadComments`, `ThreadPopover`) plus consumer adapter back-compat aliases (`PageCommentsProvider`, `useBlockComments`, `BlockCommentsPopover`, `PageCommentsPanel`, `useComments`, `usePageComments`, `useStandaloneComments`).
- Suggested action: none — slice now matches kitab `comments@0.2.0`. Future local edits should bump `consumerVersion` and re-audit.

### `command-menu` — `up-needed` · `portable`

- kitabVersion: `0.2.0`
- consumerVersion: `0.3.0`
- syncDirection: `bidirectional`
- lastPullAt: `null`
- lastPushAt: `2026-05-15T13:30:00Z`
- Local path: `frontend/slices/command-palette/`
- Blockers: — (all 5 resolved in Wave N+3.3, commit 068709c)
- Notes: Wave N+3.7 — kitab maintainer pulled UP the renderless surface as `command-menu@0.2.0` (kitab `frontend/slices/command-menu/`). This consumer remains one minor ahead because it ships the `adapters/nosion.tsx` + `adapters/NosionCommandPalette.tsx` + Nosion-keyed `lib/cmdkHistory.ts` layer that is intentionally excluded from the kitab portable surface. Verdict will read `up-needed · portable` again until either (a) we drop the adapters layer consumer-side, or (b) we promote it to its own `nosion-command-palette` consumer-locked slice. Kitab DNA file lineage entry stamped `2026-05-15T13:30:00Z` records the merge.
- Suggested action: keep `bidirectional` and bump `consumerVersion` on the next local edit. No further UP-sync until adapter scope decision.

## Aggregate suggested actions (priority order)

1. `comments` — in-sync + portable (DONE): adopted kitab `comments@0.2.0` polymorphic `TargetRef` contract. No further action.
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
| 2026-05-15T08:15:00Z    | comments refactor portable + bidirectional | 1 | (prev) | claude-code  |
| 2026-05-15T12:15:00Z    | DOWN-sync apply: adopt kitab comments@0.2.0 polymorphic TargetRef contract | 1 | (prev) | claude-code  |
| 2026-05-15T13:30:00Z    | UP-sync notion command-palette@0.3.0 → kitab command-menu@0.2.0 (renderless surface adopted, Nosion adapters left consumer-side). Bumped `kitabVersion` 0.1.0→0.2.0 + stamped `lastPushAt`. | 1 | (this) | claude-code  |
