import type { Id } from "@convex/_generated/dataModel";

export type ChangelogItemKind = "feature" | "fix" | "improvement" | "breaking";

export interface ChangelogItem {
  text: string;
  kind?: ChangelogItemKind;
}

export interface ChangelogEntry {
  _id: Id<"changelogEntries">;
  version: string;
  title: string;
  items: ChangelogItem[];
  body?: string;
  publishedAt?: number;
  publishedBy?: Id<"users">;
  createdAt: number;
  updatedAt: number;
}

export const ITEM_KIND_META: Record<ChangelogItemKind, { label: string; className: string }> = {
  feature: {
    label: "Feature",
    className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  improvement: {
    label: "Improvement",
    className: "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  },
  fix: {
    label: "Fix",
    className: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  breaking: {
    label: "Breaking",
    className: "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  },
};
