// Renderless kitab-portable core (consume with explicit `groups` prop).
export { CommandPalette as CommandPaletteCore } from "./components/CommandPalette";
// Nosion-bound consumer wrapper — back-compat default for the dashboard mount.
export { NosionCommandPalette as CommandPalette } from "./adapters/NosionCommandPalette";
export { ShortcutsDialog } from "./components/ShortcutsDialog";
export type {
  CommandGroup,
  CommandItem,
  CommandPaletteLabels,
  SearchModalLabels,
} from "./lib/types";
export { DEFAULT_PALETTE_LABELS, DEFAULT_SEARCH_LABELS } from "./lib/types";
