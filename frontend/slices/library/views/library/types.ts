import type { LibrarySectionKey } from "../../lib/groupPages";

export type TabKey = LibrarySectionKey | "databases";

export const TAB_ORDER: TabKey[] = ["recents", "favorites", "shared", "private", "databases"];

export const TAB_LABELS: Record<TabKey, string> = {
  recents: "Recents",
  favorites: "Favorites",
  shared: "Shared",
  private: "Private",
  databases: "Databases",
};

export const EMPTY_HINT: Record<TabKey, string> = {
  recents: "Pages you visit will appear here.",
  favorites: "Star pages to keep them at hand.",
  shared: "Pages you publish, and pages shared with you, appear here.",
  private: "Top-level private pages live here.",
  databases: "No databases yet — slash menu › Database to create one.",
};
