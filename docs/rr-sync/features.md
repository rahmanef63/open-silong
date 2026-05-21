# rr-sync — feature inventory

> **Auto-generated.** Edit `rr-sync.json` (registry) or rerun sync — DO NOT hand-edit this file.
> Regenerate: `node scripts/sync-to-rr.mjs --regen-doc`

Tracked slices: **7**  ·  Source: notion-page-clone  ·  Dest: `~/projects/resources`

## Summary

| slice | version | files | shared (shared+) | last sync |
|---|---|---|---|---|
| code-block | 0.1.0 | 5 | 0 (0+) | 2026-05-19 |
| database-cell-selection | 0.1.0 | 4 | 0 (0+) | 2026-05-19 |
| equation | 0.1.0 | 6 | 1 (1+) | 2026-05-19 |
| files | 0.1.0 | 11 | 0 (0+) | 2026-05-21 |
| mentions | 0.1.0 | 51 | 46 (1+) | 2026-05-19 |
| notifications | 0.1.0 | 5 | 0 (0+) | 2026-05-19 |
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

- `frontend/shared/lib/error.ts`  _(also: mentions)_

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

- `frontend/shared/components/icon-picker/components/DynamicIcon.tsx`
- `frontend/shared/components/icon-picker/components/IconPicker.tsx`
- `frontend/shared/components/icon-picker/components/IconPickerInline.tsx`
- `frontend/shared/components/icon-picker/components/PickerSkeleton.tsx`
- `frontend/shared/components/icon-picker/components/picker-parts/ColorRow.tsx`
- `frontend/shared/components/icon-picker/components/picker-parts/Toolbar.tsx`
- `frontend/shared/components/icon-picker/components/picker-parts/cells.tsx`
- `frontend/shared/components/icon-picker/index.ts`
- `frontend/shared/components/icon-picker/lib/colors.ts`
- `frontend/shared/components/icon-picker/lib/defaults.ts`
- `frontend/shared/components/icon-picker/lib/emoji-catalog.ts`
- `frontend/shared/components/icon-picker/lib/emoji-keywords.ts`
- `frontend/shared/components/icon-picker/lib/lucide-catalog.ts`
- `frontend/shared/components/icon-picker/lib/lucide-icons.ts`
- `frontend/shared/components/icon-picker/lib/parse.ts`
- `frontend/shared/components/icon-picker/lib/recents.ts`
- `frontend/shared/components/icon-picker/lib/style-pref.ts`
- `frontend/shared/components/icon-picker/lib/twemoji.ts`
- `frontend/shared/lib/databases/propertyTypeMeta.ts`
- `frontend/shared/lib/databases/relationMirror.ts`
- `frontend/shared/lib/error.ts`  _(also: equation)_
- `frontend/shared/lib/keyboard.ts`
- `frontend/shared/lib/router/index.tsx`
- `frontend/shared/lib/store/context.ts`
- `frontend/shared/lib/store/databaseActions.ts`
- `frontend/shared/lib/store/databaseActions/constants.ts`
- `frontend/shared/lib/store/databaseActions/db.ts`
- `frontend/shared/lib/store/databaseActions/properties.ts`
- `frontend/shared/lib/store/databaseActions/relations.ts`
- `frontend/shared/lib/store/databaseActions/rows.ts`
- `frontend/shared/lib/store/databaseActions/views.ts`
- `frontend/shared/lib/store/history.ts`
- `frontend/shared/lib/store/hooks.ts`
- `frontend/shared/lib/store/mappers.ts`
- `frontend/shared/lib/store/mutationGuard.ts`
- `frontend/shared/lib/store/pageActions.ts`
- `frontend/shared/lib/store/pageActions/blockCrud.ts`
- `frontend/shared/lib/store/pageActions/childrenIndex.ts`
- `frontend/shared/lib/store/pageActions/constants.ts`
- `frontend/shared/lib/store/pageActions/pageCrud.ts`
- `frontend/shared/lib/store/pageActions/searchTrash.ts`
- `frontend/shared/lib/store/snapshots.ts`
- `frontend/shared/lib/store/useThemeEffect.ts`
- `frontend/shared/lib/store/useWorkspaceMuts.ts`
- `frontend/shared/lib/uid.ts`
- `frontend/shared/types/domain.ts`

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
| `frontend/shared/lib/error.ts` | equation, mentions |

