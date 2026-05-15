/** Generic, renderless command-palette contract.
 *
 * The palette and its sub-groups consume `CommandGroup[]` plus a label bag.
 * Consumer-side adapters (e.g. `adapters/nosion.tsx`) translate domain
 * state (pages, databases, …) into this shape. Keeps the kitab slice
 * free of Nosion-specific imports.
 */

import type { ReactNode } from "react";

export interface CommandItem {
  /** Stable id for cmdk + history tracking. */
  id: string;
  /** Value used for cmdk fuzzy-search match (typically `"<type>:<title>:<id>"`). */
  value: string;
  /** Visible label. */
  label: string;
  /** Optional leading icon node. */
  icon?: ReactNode;
  /** Optional trailing slot (badge, kbd hint, count, …). */
  trailing?: ReactNode;
  /** Effect to run on select. Wrapped in the palette's `run()` helper so the
   *  dialog closes + history records before the effect fires. */
  onSelect: () => void | Promise<void>;
  /** Optional history-tracker entry. When present the palette persists
   *  `{ id, label }` to its MRU store on select. */
  track?: { id: string; label: string };
}

export interface CommandGroup {
  /** Stable id (used as React key + history bucket). */
  id: string;
  /** Visible heading. */
  heading: string;
  items: CommandItem[];
  /** Hide this group when query is non-empty (e.g. Favorites/Recent). */
  hideOnQuery?: boolean;
  /** Show this group ONLY when query is non-empty (e.g. search results). */
  showOnQueryOnly?: boolean;
}

export interface CommandPaletteLabels {
  placeholder?: string;
  empty?: string;
  recentCommandsHeading?: string;
}

export const DEFAULT_PALETTE_LABELS: Required<CommandPaletteLabels> = {
  placeholder: "Search pages, databases, or run a command…",
  empty: "No results.",
  recentCommandsHeading: "Recent commands",
};

export interface SearchModalLabels {
  searchTitle?: string;
  searchDescription?: string;
  searchPlaceholder?: string;
  emptyHint?: string;
  noResults?: (query: string) => string;
  recentHeading?: string;
  pagesHeading?: string;
  databasesHeading?: string;
  escapeHint?: string;
}

export const DEFAULT_SEARCH_LABELS: Required<SearchModalLabels> = {
  searchTitle: "Search workspace",
  searchDescription: "Search pages and databases by title.",
  searchPlaceholder: "Search pages and databases…",
  emptyHint: "Start typing to search your workspace",
  noResults: (q) => `No results for "${q}"`,
  recentHeading: "Recent",
  pagesHeading: "Pages",
  databasesHeading: "Databases",
  escapeHint: "ESC",
};
