# Tech debt — known deviations from `.claude/RULES.md`

Each entry: what's wrong, why it's still there, who'll fix it.

## Medium

### `src/components/editor/PageEditor.tsx` (394 lines)
- **Wrong:** view shell + header + DnD wiring + subpages section all inline.
- **Fix:** extract `Header`, `Subpages`, `IconPicker`, `LockBanner` into own files.
  DnD wiring stays — already factored into `lib/blockTree.ts` + `lib/collisionPriority.ts`.

### `src/components/database/DatabaseBlock.tsx` (384 lines)
- **Wrong:** toolbar + view-tabs + properties-menu inline.
- **Fix:** split toolbar / view-tabs / props-menu subcomponents.

### `src/components/editor/PageActionsMenu.tsx` (353 lines)
- **Fix:** extract `useCopyActions`, `useExportImport`, `useMoveActions` hooks.
  Render menu rows from a config array.

### `src/components/database/views/{Table,Timeline}View.tsx` (200+)
- **Fix:** extract row / column subcomponents.

## Low

### `src/components/WorkspaceSidebar.tsx` (250 lines)
- Still over 200 cap but the heavy lifting moved to `src/slices/workspace-sidebar/`.
- **Fix:** lift remaining sections (Favorites/Recent/Workspace/Databases/Trash)
  into the slice, leaving `WorkspaceSidebar.tsx` as a thin host.

### `src/components/Dashboard.tsx` (217 lines)
- **Fix:** extract `Greeting`, `ActionCards`, `Section`, `PageCard` to
  `src/slices/dashboard/components/` (new slice).

### `src/lib/store.tsx` (235 lines)
- Was 888. Most domain hooks already extracted to `src/lib/store/`.
- **Fix:** continue progressive extraction — sharing → databases → pages
  each get their own slice hook calling Convex directly.

### `src/components/editor/` and `src/components/database/` not as slices
- Per ARCHITECTURE.md these should live under `src/slices/{editor,databases}/`.
- **Why still here:** ~80 files; touches every import.
- **Fix:** dedicated PR with `git mv` + sed.

## Resolved (kept for history — see git log)

- **2026-05-01** `src/components/ui/` → `src/shared/ui/` (49 shadcn files,
  50 import sites updated, `components.json` aliases bumped).
- **2026-05-01** Empty slice scaffolds removed: `page-actions/`, `properties/`,
  `sub-items/` + 8 empty subfolders inside live slices.
- **2026-05-01** ARCHITECTURE.md updated: `types/index.ts` is the convention
  (was flat `types.ts`).
- **(prior)** `src/lib/store.tsx` shrunk 888 → 235 via extraction to
  `src/lib/store/{history,snapshots,pageActions,databaseActions}.ts`.
- **(prior)** `src/components/database/PropertyCell.tsx` 657 → 181 via per-type
  module extraction to `src/components/database/property-cells/<type>.tsx`.
- **(prior)** `src/components/editor/BlockEditor.tsx` 643 → 328 via block-shell /
  block-controls / block-body / per-type renderer split + `BLOCK_RENDERERS` registry.
- **(prior)** `src/lib/{utils,format,keyboard,markdown}.ts` → `src/shared/lib/`.
- **(prior)** `src/hooks/` → `src/shared/hooks/`.
