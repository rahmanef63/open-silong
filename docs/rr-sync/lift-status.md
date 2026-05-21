# open-silong → rr lift status (2026-05-21)

Per-slice tracking of every open-silong slice's lift state to rr.
Updated after each sync round. Pair with `rr-sync.json.tracked`
(file-hash drift detection) and rr's catalog `tags: "notion-like"`
(consumer-facing filter).

## Summary

| Status | Count | Where |
|---|---|---|
| ✅ Synced (compiles in rr) | **7** | `frontend/slices/<slug>/` in rr standalone |
| 🟡 In mega-bundle only | **20** | `template-base/frontend/slices/notion/slices/` in rr |
| 🔴 Blocked-pending-adapter | **10** | needs lift but convex/coupling/missing-primitives |
| **TOTAL** | **37** | every nosion slice with `slice.manifest.json` |

## ✅ Synced (file-level, tsc green in rr)

| Slice | Lift date | Wave | Why portable |
|---|---|---|---|
| `equation` | 2026-05-19 | sync round 0 | pure UI, no convex |
| `notifications` | 2026-05-19 | sync round 0 | pure UI, no convex |
| `code-block` | 2026-05-19 | sync round 0 | pure UI, no convex |
| `database-cell-selection` | 2026-05-19 | sync round 0 | pure UI hook |
| `mentions` | 2026-05-19 | sync round 0 | pure UI parser |
| `theme-presets` | 2026-05-20 | sync round 1 (BS) | tweakcn + next-themes, no backend |
| `files` | 2026-05-21 | sync round 2 (BT) | **storage-adapter pattern** — `FilesAdapter` (upload + remove + useUrl). nosion wires `useConvexFilesAdapter` (skip-listed in rr-sync.json), rr defaults to `useLocalStorageFilesAdapter` (data-URL bucket). First proof of the adapter contract — reference for the remaining round 2 lifts. |

Tag in rr catalog: `notion-like`. Source field: `notion-page-clone`.

## 🔴 Blocked-pending-adapter (10 slices)

Each row: blocker + adapter contract needed. **Pattern reference:**
the `files` slice (synced 2026-05-21) is the first proof of the
storage-adapter contract — see its `adapter/types.ts` and
`adapter/{convex,localStorage}Adapter.{tsx,ts}` for the template.

| Slice | Blocker | Path forward |
|---|---|---|
| `ai-agent` | 2 `@convex/_generated` imports (AI tool/skill registry tables) | Storage-adapter interface for registry CRUD; localStorage fallback for demo |
| `cover` | 2 convex imports (`files` slice + Unsplash backend action) | Now unblocked on the files side; needs Unsplash render-prop adapter only |
| `feedback` | 3 convex imports (feedback submission mutations) | Adapter for submit; localStorage demo bucket |
| `inbox` | 2 convex imports (notifications + activity feed) | Adapter for stream; SSE or polling option |
| `library` | depends on `workspace-io` (blocked) | Lift after workspace-io adapter |
| `mobile-nav` | deps on admin-panel + ai-agent + inbox + templates (all blocked) | Cascade-blocked; lift after deps |
| `templates` | 2 convex imports (template CRUD + AI generator) | Adapter for storage + AI provider injection |
| `workspace-io` | 2 convex imports (import mutation reads + write all tables) | Adapter for import/export; JSON serializer already pure |
| `workspace-members` | 1 convex import (member CRUD + invites table) | Adapter for membership + invite token storage |
| `database-json` | depends on `database-csv` (in mega-bundle, no standalone) | Lift database-csv standalone first, then database-json |

## 🟡 In mega-bundle only (20 slices)

These live in rr's `template-base/frontend/slices/notion/slices/`
as part of the drop-in mega-bundle, but DON'T exist as standalone
slices in rr's `frontend/slices/`. Promotion to standalone needs
the same adapter pattern + dep resolution work.

```
analytics · backlinks · block-selection · command-palette · dashboard ·
database-csv · database-presets · database-templates · databases · editor ·
files · inbox · search · sharing · simple-table · snapshots · trash · wiki ·
workspace-sidebar · mentions(duplicate of synced standalone)
```

Note: `comments` is in both mega-bundle AND lifted standalone (sync round 0). The standalone version has a host-adapter pattern.

## Tracking sources

| Source | What it tracks | How to query |
|---|---|---|
| `rr-sync.json` (this repo) | per-file hashes for ✅ Synced — drift detect | `node scripts/rr-sync-status.mjs` |
| `docs/rr-sync/lift-status.md` (this file) | per-slice status table — adapter blockers | manual read / grep |
| rr catalog `tags: ["notion-like"]` (lib/content/slices.ts) | consumer-visible tag for filtering | rr UI filter / `grep "notion-like" lib/content/slices.ts` |
| rr `source: "notion-page-clone"` in catalog | provenance field | `grep 'source.*notion-page-clone' lib/content/slices.ts` |

## Lift technique notes

For the 11 blocked slices, the universal fix is **storage-adapter
pattern** — the same approach used by `notion-shell` to ship
production-grade UI without dragging Convex into rr. Contract:

```ts
interface SliceAdapter<T> {
  list(filter?): Promise<T[]> | T[];
  get(id): Promise<T | null> | T | null;
  create(input): Promise<T>;
  update(id, patch): Promise<T>;
  remove(id): Promise<void>;
  subscribe?(cb): () => void;
}
```

Slice ships UI components + types + a default localStorage adapter.
Host (whether nosion's Convex backend or a fresh project's
localStorage) wires a custom adapter via React context. Strip every
direct `@convex/_generated` import; pass data via render-prop or
adapter call.

Per-slice adapter work is **~2-4 hours** depending on surface area.
Realistic batch order (✅ marks done):
1. ✅ files (foundation — many depend on it) — synced 2026-05-21
2. workspace-members (clean — 1 convex import)
3. workspace-io (depends on files; JSON serializer already pure)
4. library (depends on workspace-io)
5. cover (depends on files; Unsplash render-prop)
6. feedback (3 convex; simple submit + read)
7. inbox (2 convex; activity stream)
8. ai-agent (2 convex; registry CRUD + AI provider injection)
9. templates (2 convex; storage + AI gen)
10. mobile-nav (cascade-unblocks after deps)
11. database-json (after database-csv lifted standalone)

## Mega-bundle promotion (20 slices)

Separate roadmap. Mega-bundle promotion = breaking each
template-base/notion/slices/<name> out into `frontend/slices/<name>`
standalone with own slice.manifest + catalog entry. Most need the
same adapter pattern + `responsive-dialog` / `responsive-alert-dialog`
lift first.

## Re-sync cadence

After every wave that touches `frontend/slices/<lifted-slug>/` on the
nosion side, run:

```bash
node scripts/sync-to-rr.mjs <slug>   # one slice
node scripts/sync-to-rr.mjs --list   # show tracked + last-sync
```

Drift surfaces via the pre-push nag (non-blocking) — see
`.git/hooks/pre-push`.
