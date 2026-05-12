/**
 * Default icons assigned to newly-created entities. Lucide refs (not
 * emoji) so the UI shows a consistent line-art glyph in every surface
 * that uses DynamicIcon — sidebar rows, create menus, page headers,
 * row peeks, etc.
 *
 * Users override per-entity via IconPickerPopover. Clearing an icon
 * reverts to the relevant default below, not to undefined, so the
 * DynamicIcon never has to fall back to its own internal placeholder.
 */
export const DEFAULT_PAGE_ICON = "lucide:FileText";
export const DEFAULT_DATABASE_ICON = "lucide:Database";
export const DEFAULT_ROW_ICON = "lucide:FileText";
