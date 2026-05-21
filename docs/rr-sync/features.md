# rr-sync — feature inventory

> **Auto-generated.** Edit `rr-sync.json` (registry) or rerun sync — DO NOT hand-edit this file.
> Regenerate: `node scripts/sync-to-rr.mjs --regen-doc`

Tracked slices: **8**  ·  Source: notion-page-clone  ·  Dest: `~/projects/resources`

## Summary

| slice | version | files | shared (shared+) | last sync |
|---|---|---|---|---|
| code-block | 0.1.0 | 5 | 0 (0+) | 2026-05-19 |
| database-cell-selection | 0.1.0 | 4 | 0 (0+) | 2026-05-19 |
| equation | 0.1.0 | 6 | 1 (1+) | 2026-05-19 |
| files | 0.1.0 | 11 | 0 (0+) | 2026-05-21 |
| mentions | 0.1.0 | 51 | 46 (46+) | 2026-05-19 |
| notifications | 0.1.0 | 5 | 0 (0+) | 2026-05-19 |
| notion | 0.1.0 | 416 | 80 (47+) | 2026-05-21 |
| theme-presets | 0.1.0 | 20 | 0 (0+) | 2026-05-20 |

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

### `database-cell-selection`

- **version:** 0.1.0
- **synced:** 2026-05-19T09:19:21.907Z (commit `250d8e7`)
- **slicePath:** `frontend/slices/database-cell-selection`

**slice files (4):**

- `frontend/slices/database-cell-selection/components/SelectableCell.tsx`
- `frontend/slices/database-cell-selection/hooks/useDragFill.ts`
- `frontend/slices/database-cell-selection/index.ts`
- `frontend/slices/database-cell-selection/slice.manifest.json`

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

- `frontend/shared/lib/error.ts`  _(also: mentions, notion)_

### `files`

- **version:** 0.1.0
- **synced:** 2026-05-21T06:15:56.713Z (commit `13006ef`)
- **slicePath:** `frontend/slices/files`

**slice files (11):**

- `frontend/slices/files/adapter/context.tsx`
- `frontend/slices/files/adapter/localStorageAdapter.ts`
- `frontend/slices/files/adapter/types.ts`
- `frontend/slices/files/components/FileChip.tsx`
- `frontend/slices/files/components/FileUploadButton.tsx`
- `frontend/slices/files/hooks/useFileUpload.ts`
- `frontend/slices/files/hooks/useFileUrl.ts`
- `frontend/slices/files/index.ts`
- `frontend/slices/files/lib/parse.ts`
- `frontend/slices/files/slice.manifest.json`
- `frontend/slices/files/types/index.ts`

### `mentions`

- **version:** 0.1.0
- **synced:** 2026-05-19T11:26:00.665Z (commit `2f24680`)
- **slicePath:** `frontend/slices/mentions`

**slice files (5):**

- `frontend/slices/mentions/components/MentionsPopover.tsx`
- `frontend/slices/mentions/hooks/useMentions.ts`
- `frontend/slices/mentions/index.ts`
- `frontend/slices/mentions/slice.manifest.json`
- `frontend/slices/mentions/types/index.ts`

**shared deps (46):**

- `frontend/shared/components/icon-picker/components/DynamicIcon.tsx`  _(also: notion)_
- `frontend/shared/components/icon-picker/components/IconPicker.tsx`  _(also: notion)_
- `frontend/shared/components/icon-picker/components/IconPickerInline.tsx`  _(also: notion)_
- `frontend/shared/components/icon-picker/components/PickerSkeleton.tsx`  _(also: notion)_
- `frontend/shared/components/icon-picker/components/picker-parts/ColorRow.tsx`  _(also: notion)_
- `frontend/shared/components/icon-picker/components/picker-parts/Toolbar.tsx`  _(also: notion)_
- `frontend/shared/components/icon-picker/components/picker-parts/cells.tsx`  _(also: notion)_
- `frontend/shared/components/icon-picker/index.ts`  _(also: notion)_
- `frontend/shared/components/icon-picker/lib/colors.ts`  _(also: notion)_
- `frontend/shared/components/icon-picker/lib/defaults.ts`  _(also: notion)_
- `frontend/shared/components/icon-picker/lib/emoji-catalog.ts`  _(also: notion)_
- `frontend/shared/components/icon-picker/lib/emoji-keywords.ts`  _(also: notion)_
- `frontend/shared/components/icon-picker/lib/lucide-catalog.ts`  _(also: notion)_
- `frontend/shared/components/icon-picker/lib/lucide-icons.ts`  _(also: notion)_
- `frontend/shared/components/icon-picker/lib/parse.ts`  _(also: notion)_
- `frontend/shared/components/icon-picker/lib/recents.ts`  _(also: notion)_
- `frontend/shared/components/icon-picker/lib/style-pref.ts`  _(also: notion)_
- `frontend/shared/components/icon-picker/lib/twemoji.ts`  _(also: notion)_
- `frontend/shared/lib/databases/propertyTypeMeta.ts`  _(also: notion)_
- `frontend/shared/lib/databases/relationMirror.ts`  _(also: notion)_
- `frontend/shared/lib/error.ts`  _(also: equation, notion)_
- `frontend/shared/lib/keyboard.ts`  _(also: notion)_
- `frontend/shared/lib/router/index.tsx`  _(also: notion)_
- `frontend/shared/lib/store/context.ts`  _(also: notion)_
- `frontend/shared/lib/store/databaseActions.ts`  _(also: notion)_
- `frontend/shared/lib/store/databaseActions/constants.ts`  _(also: notion)_
- `frontend/shared/lib/store/databaseActions/db.ts`  _(also: notion)_
- `frontend/shared/lib/store/databaseActions/properties.ts`  _(also: notion)_
- `frontend/shared/lib/store/databaseActions/relations.ts`  _(also: notion)_
- `frontend/shared/lib/store/databaseActions/rows.ts`  _(also: notion)_
- `frontend/shared/lib/store/databaseActions/views.ts`  _(also: notion)_
- `frontend/shared/lib/store/history.ts`  _(also: notion)_
- `frontend/shared/lib/store/hooks.ts`  _(also: notion)_
- `frontend/shared/lib/store/mappers.ts`  _(also: notion)_
- `frontend/shared/lib/store/mutationGuard.ts`  _(also: notion)_
- `frontend/shared/lib/store/pageActions.ts`  _(also: notion)_
- `frontend/shared/lib/store/pageActions/blockCrud.ts`  _(also: notion)_
- `frontend/shared/lib/store/pageActions/childrenIndex.ts`  _(also: notion)_
- `frontend/shared/lib/store/pageActions/constants.ts`  _(also: notion)_
- `frontend/shared/lib/store/pageActions/pageCrud.ts`  _(also: notion)_
- `frontend/shared/lib/store/pageActions/searchTrash.ts`  _(also: notion)_
- `frontend/shared/lib/store/snapshots.ts`  _(also: notion)_
- `frontend/shared/lib/store/useThemeEffect.ts`  _(also: notion)_
- `frontend/shared/lib/store/useWorkspaceMuts.ts`  _(also: notion)_
- `frontend/shared/lib/uid.ts`  _(also: notion)_
- `frontend/shared/types/domain.ts`  _(also: notion, notion)_

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

### `notion`

- **version:** 0.1.0
- **synced:** 2026-05-21T21:48:38.256Z (commit `bd51560`)
- **slicePath:** `frontend/slices/notion`

**slice files (12):**

- `frontend/slices/notion/NotionAppProvider.tsx`
- `frontend/slices/notion/README.md`
- `frontend/slices/notion/adapter/context.tsx`
- `frontend/slices/notion/adapter/localStorageAdapter/databases.ts`
- `frontend/slices/notion/adapter/localStorageAdapter/index.ts`
- `frontend/slices/notion/adapter/localStorageAdapter/pages.ts`
- `frontend/slices/notion/adapter/localStorageAdapter/store.ts`
- `frontend/slices/notion/adapter/noopAdapter.ts`
- `frontend/slices/notion/adapter/types.ts`
- `frontend/slices/notion/index.ts`
- `frontend/slices/notion/lib/config.ts`
- `frontend/slices/notion/slice.manifest.json`

**shared deps (80):**

- `frontend/shared/components/ConfirmProvider.tsx`
- `frontend/shared/components/ErrorBoundary.tsx`
- `frontend/shared/components/Marquee.tsx`
- `frontend/shared/components/PageHeaderSlot.tsx`
- `frontend/shared/components/RouteSkeleton.tsx`
- `frontend/shared/components/icon-picker/components/DynamicIcon.tsx`  _(also: mentions)_
- `frontend/shared/components/icon-picker/components/IconPicker.tsx`  _(also: mentions)_
- `frontend/shared/components/icon-picker/components/IconPickerInline.tsx`  _(also: mentions)_
- `frontend/shared/components/icon-picker/components/PickerSkeleton.tsx`  _(also: mentions)_
- `frontend/shared/components/icon-picker/components/picker-parts/ColorRow.tsx`  _(also: mentions)_
- `frontend/shared/components/icon-picker/components/picker-parts/Toolbar.tsx`  _(also: mentions)_
- `frontend/shared/components/icon-picker/components/picker-parts/cells.tsx`  _(also: mentions)_
- `frontend/shared/components/icon-picker/index.ts`  _(also: mentions)_
- `frontend/shared/components/icon-picker/lib/colors.ts`  _(also: mentions)_
- `frontend/shared/components/icon-picker/lib/defaults.ts`  _(also: mentions)_
- `frontend/shared/components/icon-picker/lib/emoji-catalog.ts`  _(also: mentions)_
- `frontend/shared/components/icon-picker/lib/emoji-keywords.ts`  _(also: mentions)_
- `frontend/shared/components/icon-picker/lib/lucide-catalog.ts`  _(also: mentions)_
- `frontend/shared/components/icon-picker/lib/lucide-icons.ts`  _(also: mentions)_
- `frontend/shared/components/icon-picker/lib/parse.ts`  _(also: mentions)_
- `frontend/shared/components/icon-picker/lib/recents.ts`  _(also: mentions)_
- `frontend/shared/components/icon-picker/lib/style-pref.ts`  _(also: mentions)_
- `frontend/shared/components/icon-picker/lib/twemoji.ts`  _(also: mentions)_
- `frontend/shared/components/marquee/predicates.ts`
- `frontend/shared/components/marquee/types.ts`
- `frontend/shared/components/marquee/useMarqueeDrag.ts`
- `frontend/shared/components/notion/NotionBlock.tsx`
- `frontend/shared/components/notion/NotionDatabase.tsx`
- `frontend/shared/components/notion/NotionHeader.tsx`
- `frontend/shared/components/notion/NotionPage.tsx`
- `frontend/shared/components/notion/NotionProperty.tsx`
- `frontend/shared/components/notion/NotionSidebar.tsx`
- `frontend/shared/components/notion/index.ts`
- `frontend/shared/hooks/useAsyncError.ts`
- `frontend/shared/hooks/useBlockHistory.ts`
- `frontend/shared/lib/csv.ts`
- `frontend/shared/lib/databaseTable.ts`
- `frontend/shared/lib/databases/propertyTypeMeta.ts`  _(also: mentions)_
- `frontend/shared/lib/databases/relationMirror.ts`  _(also: mentions)_
- `frontend/shared/lib/error.ts`  _(also: equation, mentions)_
- `frontend/shared/lib/exportContext.ts`
- `frontend/shared/lib/format.ts`
- `frontend/shared/lib/html.ts`
- `frontend/shared/lib/inlineMd.tsx`
- `frontend/shared/lib/keyboard.ts`  _(also: mentions)_
- `frontend/shared/lib/markdown.ts`
- `frontend/shared/lib/router/index.tsx`  _(also: mentions)_
- `frontend/shared/lib/routes.ts`
- `frontend/shared/lib/seed.ts`
- `frontend/shared/lib/seed/pages.ts`
- `frontend/shared/lib/seed/profile.ts`
- `frontend/shared/lib/seed/tasksDb.ts`
- `frontend/shared/lib/store.tsx`
- `frontend/shared/lib/store/context.ts`  _(also: mentions)_
- `frontend/shared/lib/store/databaseActions.ts`  _(also: mentions)_
- `frontend/shared/lib/store/databaseActions/constants.ts`  _(also: mentions)_
- `frontend/shared/lib/store/databaseActions/db.ts`  _(also: mentions)_
- `frontend/shared/lib/store/databaseActions/properties.ts`  _(also: mentions)_
- `frontend/shared/lib/store/databaseActions/relations.ts`  _(also: mentions)_
- `frontend/shared/lib/store/databaseActions/rows.ts`  _(also: mentions)_
- `frontend/shared/lib/store/databaseActions/views.ts`  _(also: mentions)_
- `frontend/shared/lib/store/history.ts`  _(also: mentions)_
- `frontend/shared/lib/store/hooks.ts`  _(also: mentions)_
- `frontend/shared/lib/store/mappers.ts`  _(also: mentions)_
- `frontend/shared/lib/store/mutationGuard.ts`  _(also: mentions)_
- `frontend/shared/lib/store/pageActions.ts`  _(also: mentions)_
- `frontend/shared/lib/store/pageActions/blockCrud.ts`  _(also: mentions)_
- `frontend/shared/lib/store/pageActions/childrenIndex.ts`  _(also: mentions)_
- `frontend/shared/lib/store/pageActions/constants.ts`  _(also: mentions)_
- `frontend/shared/lib/store/pageActions/pageCrud.ts`  _(also: mentions)_
- `frontend/shared/lib/store/pageActions/searchTrash.ts`  _(also: mentions)_
- `frontend/shared/lib/store/snapshots.ts`  _(also: mentions)_
- `frontend/shared/lib/store/useThemeEffect.ts`  _(also: mentions)_
- `frontend/shared/lib/store/useWorkspaceMuts.ts`  _(also: mentions)_
- `frontend/shared/lib/uid.ts`  _(also: mentions)_
- `frontend/shared/lib/zipExport.ts`
- `frontend/shared/types/block.ts`
- `frontend/shared/types/domain.ts`  _(also: mentions)_
- `frontend/shared/types/domain.ts`  _(also: mentions)_
- `frontend/shared/types/index.ts`

**convex deps (1):**

- `convex/features/unsplash/actions.ts`

### `theme-presets`

- **version:** 0.1.0
- **synced:** 2026-05-20T15:24:20.427Z (commit `1f012ad`)
- **slicePath:** `frontend/slices/theme-presets`

**slice files (20):**

- `frontend/slices/theme-presets/components/ThemeColorSync.tsx`
- `frontend/slices/theme-presets/components/ThemePicker.tsx`
- `frontend/slices/theme-presets/components/TweakcnSwitcher.tsx`
- `frontend/slices/theme-presets/components/tweakcn/ModeRow.tsx`
- `frontend/slices/theme-presets/components/tweakcn/PresetList.tsx`
- `frontend/slices/theme-presets/index.ts`
- `frontend/slices/theme-presets/lib/tweakcn.ts`
- `frontend/slices/theme-presets/lib/tweakcn/apply.ts`
- `frontend/slices/theme-presets/lib/tweakcn/cssBuilder.ts`
- `frontend/slices/theme-presets/lib/tweakcn/groups.ts`
- `frontend/slices/theme-presets/lib/tweakcn/registry.ts`
- `frontend/slices/theme-presets/lib/tweakcn/tokens.ts`
- `frontend/slices/theme-presets/lib/tweakcn/types.ts`
- `frontend/slices/theme-presets/presets.ts`
- `frontend/slices/theme-presets/presets/apply.ts`
- `frontend/slices/theme-presets/presets/factories.ts`
- `frontend/slices/theme-presets/presets/list.ts`
- `frontend/slices/theme-presets/presets/types.ts`
- `frontend/slices/theme-presets/slice.manifest.json`
- `frontend/slices/theme-presets/useThemePreset.ts`

## Shared file → consumers map

_Files used by 2+ tracked slices. Keep these in sync — corruption here breaks every consumer._

| shared file | consumers |
|---|---|
| `frontend/shared/components/icon-picker/components/DynamicIcon.tsx` | mentions, notion |
| `frontend/shared/components/icon-picker/components/IconPicker.tsx` | mentions, notion |
| `frontend/shared/components/icon-picker/components/IconPickerInline.tsx` | mentions, notion |
| `frontend/shared/components/icon-picker/components/PickerSkeleton.tsx` | mentions, notion |
| `frontend/shared/components/icon-picker/components/picker-parts/ColorRow.tsx` | mentions, notion |
| `frontend/shared/components/icon-picker/components/picker-parts/Toolbar.tsx` | mentions, notion |
| `frontend/shared/components/icon-picker/components/picker-parts/cells.tsx` | mentions, notion |
| `frontend/shared/components/icon-picker/index.ts` | mentions, notion |
| `frontend/shared/components/icon-picker/lib/colors.ts` | mentions, notion |
| `frontend/shared/components/icon-picker/lib/defaults.ts` | mentions, notion |
| `frontend/shared/components/icon-picker/lib/emoji-catalog.ts` | mentions, notion |
| `frontend/shared/components/icon-picker/lib/emoji-keywords.ts` | mentions, notion |
| `frontend/shared/components/icon-picker/lib/lucide-catalog.ts` | mentions, notion |
| `frontend/shared/components/icon-picker/lib/lucide-icons.ts` | mentions, notion |
| `frontend/shared/components/icon-picker/lib/parse.ts` | mentions, notion |
| `frontend/shared/components/icon-picker/lib/recents.ts` | mentions, notion |
| `frontend/shared/components/icon-picker/lib/style-pref.ts` | mentions, notion |
| `frontend/shared/components/icon-picker/lib/twemoji.ts` | mentions, notion |
| `frontend/shared/lib/databases/propertyTypeMeta.ts` | mentions, notion |
| `frontend/shared/lib/databases/relationMirror.ts` | mentions, notion |
| `frontend/shared/lib/error.ts` | equation, mentions, notion |
| `frontend/shared/lib/keyboard.ts` | mentions, notion |
| `frontend/shared/lib/router/index.tsx` | mentions, notion |
| `frontend/shared/lib/store/context.ts` | mentions, notion |
| `frontend/shared/lib/store/databaseActions.ts` | mentions, notion |
| `frontend/shared/lib/store/databaseActions/constants.ts` | mentions, notion |
| `frontend/shared/lib/store/databaseActions/db.ts` | mentions, notion |
| `frontend/shared/lib/store/databaseActions/properties.ts` | mentions, notion |
| `frontend/shared/lib/store/databaseActions/relations.ts` | mentions, notion |
| `frontend/shared/lib/store/databaseActions/rows.ts` | mentions, notion |
| `frontend/shared/lib/store/databaseActions/views.ts` | mentions, notion |
| `frontend/shared/lib/store/history.ts` | mentions, notion |
| `frontend/shared/lib/store/hooks.ts` | mentions, notion |
| `frontend/shared/lib/store/mappers.ts` | mentions, notion |
| `frontend/shared/lib/store/mutationGuard.ts` | mentions, notion |
| `frontend/shared/lib/store/pageActions.ts` | mentions, notion |
| `frontend/shared/lib/store/pageActions/blockCrud.ts` | mentions, notion |
| `frontend/shared/lib/store/pageActions/childrenIndex.ts` | mentions, notion |
| `frontend/shared/lib/store/pageActions/constants.ts` | mentions, notion |
| `frontend/shared/lib/store/pageActions/pageCrud.ts` | mentions, notion |
| `frontend/shared/lib/store/pageActions/searchTrash.ts` | mentions, notion |
| `frontend/shared/lib/store/snapshots.ts` | mentions, notion |
| `frontend/shared/lib/store/useThemeEffect.ts` | mentions, notion |
| `frontend/shared/lib/store/useWorkspaceMuts.ts` | mentions, notion |
| `frontend/shared/lib/uid.ts` | mentions, notion |
| `frontend/shared/types/domain.ts` | mentions, notion, notion |

