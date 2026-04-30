# Tech debt — known deviations from `.claude/RULES.md`

Each entry: what's wrong, why it's still there, who'll fix it.

## High

### `src/lib/store.tsx` (888 lines)
- **Wrong:** monolithic React Context wrapping all Convex bindings; violates
  rule 4 (200-line cap), rule 1 (cross-feature concerns in one file).
- **Why still here:** 30+ components consume `useStore()`. Migrating in one
  pass would touch every file.
- **Fix:** progressive extraction — each new slice gets its own
  `use<Slice>()` hook calling Convex directly. `useStore()` shrinks each PR.
- **Order:** inbox ✓, comments ✓, files ✓, then snapshots → sharing → databases → pages.

### `src/components/database/PropertyCell.tsx` (657 lines)
- **Wrong:** all 18 property type cells in one file.
- **Fix:** extract to `src/slices/properties/components/cells/<type>.tsx`
  (one cell per file). Wrap in a registry so `PropertyCell` becomes a dispatcher.

### `src/components/editor/BlockEditor.tsx` (643 lines)
- **Wrong:** every block-type renderer + handlers in one component.
- **Fix:** extract per-type renderers to
  `src/slices/blocks/components/types/<type>.tsx`. Use a registry.

### `src/components/WorkspaceSidebar.tsx` (561 lines)
- **Wrong:** sidebar header, sections, dnd, search all in one file.
- **Fix:** split into `Header`, `Sections/{Favorites,Recent,Workspace,Databases,Trash}`,
  `Tree/SortablePageRow`. Move under `src/slices/workspace/`.

### `src/components/editor/PageActionsMenu.tsx` (390 lines)
- **Wrong:** all handlers + UI inline.
- **Fix:** extract `useCopyActions`, `useExportImport`, `useMoveActions` hooks.
  Render rows from a config array.

## Medium

### `src/components/database/DatabaseBlock.tsx` (367 lines)
- **Fix:** split toolbar / view-tabs / properties-menu into subcomponents.

### `src/components/editor/PageEditor.tsx` (313 lines)
- **Fix:** extract `Header` (already a sub-fn, give it its own file),
  `Subpages`, `IconPicker`, `LockBanner`.

### `src/components/Dashboard.tsx` (217 lines)
- **Fix:** extract `Greeting`, `ActionCards`, `Section`, `PageCard` to
  `src/slices/workspace/components/`.

### `src/components/database/views/{Table,Timeline}View.tsx` (200+)
- **Fix:** extract row/column subcomponents.

## Low

### `src/components/ui/` (shadcn) lives outside `shared/`
- **Wrong:** rule 2 says shared UI is `src/shared/ui/`.
- **Why still here:** moving it requires a sed pass on ~80 files. Low risk
  once tests are stable, but no value adding it to the same PR as features.
- **Fix:** dedicated PR — `git mv src/components/ui src/shared/ui` then
  `sed -i 's|@/components/ui|@/shared/ui|g' $(git ls-files '*.tsx' '*.ts')`.

### `src/lib/{utils,format,keyboard,markdown}.ts` not yet under `shared/`
- **Fix:** `git mv` to `src/shared/lib/`. Single sed pass for imports.

### `src/hooks/` not yet under `shared/`
- **Fix:** `git mv src/hooks src/shared/hooks`.
