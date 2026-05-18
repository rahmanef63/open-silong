import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
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
  publishedAt: number;
  createdAt: number;
}

/** Pull-model: query the published-and-unread changelog entries for the
 *  current viewer. Used by the inbox to surface release notes alongside
 *  regular notifications. */
export function useChangelog() {
  const unreadRaw = useQuery(api.features.changelog.queries.listUnread);
  const unreadCountRaw = useQuery(api.features.changelog.queries.unreadCount);
  const markAllRead = useMutation(api.features.changelog.mutations.markAllRead);

  return {
    unread: (unreadRaw ?? []) as ChangelogEntry[],
    unreadCount: unreadCountRaw ?? 0,
    markAllRead,
    isLoading: unreadRaw === undefined,
  };
}
