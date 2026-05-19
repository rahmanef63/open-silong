# rr-sync — feature inventory

> **Auto-generated.** Edit `rr-sync.json` (registry) or rerun sync — DO NOT hand-edit this file.
> Regenerate: `node scripts/sync-to-rr.mjs --regen-doc`

Tracked slices: **3**  ·  Source: notion-page-clone  ·  Dest: `~/projects/resources`

## Summary

| slice | version | files | shared (shared+) | last sync |
|---|---|---|---|---|
| code-block | 0.1.0 | 5 | 0 (0+) | 2026-05-19 |
| equation | 0.1.0 | 6 | 1 (0+) | 2026-05-19 |
| notifications | 0.1.0 | 5 | 0 (0+) | 2026-05-19 |

- **shared+** = count of shared files this slice depends on that ALSO consumed by another tracked slice. High value = shared infra that must stay coherent.

## Per-slice file lists

### `code-block`

- **version:** 0.1.0
- **synced:** 2026-05-19T07:42:08.310Z (commit `00fba33`)
- **slicePath:** `frontend/slices/code-block`

**slice files (5):**

- `frontend/slices/code-block/components/CodeBlock.tsx`
- `frontend/slices/code-block/index.ts`
- `frontend/slices/code-block/lib/languages.ts`
- `frontend/slices/code-block/slice.manifest.json`
- `frontend/slices/code-block/types/index.ts`

### `equation`

- **version:** 0.1.0
- **synced:** 2026-05-19T06:39:18.377Z (commit `0b5e4f3`)
- **slicePath:** `frontend/slices/equation`

**slice files (5):**

- `frontend/slices/equation/components/EquationBlock.tsx`
- `frontend/slices/equation/index.ts`
- `frontend/slices/equation/slice.contract.ts`
- `frontend/slices/equation/slice.manifest.json`
- `frontend/slices/equation/types/index.ts`

**shared deps (1):**

- `frontend/shared/lib/error.ts`

### `notifications`

- **version:** 0.1.0
- **synced:** 2026-05-19T07:37:17.443Z (commit `00fba33`)
- **slicePath:** `frontend/slices/notifications`

**slice files (5):**

- `frontend/slices/notifications/components/NotifyMePopover.tsx`
- `frontend/slices/notifications/hooks/useSubscription.ts`
- `frontend/slices/notifications/index.ts`
- `frontend/slices/notifications/slice.manifest.json`
- `frontend/slices/notifications/types/index.ts`

## Shared file → consumers map

_Files used by 2+ tracked slices. Keep these in sync — corruption here breaks every consumer._

_(none yet — first multi-consumer shared file will surface here)_

