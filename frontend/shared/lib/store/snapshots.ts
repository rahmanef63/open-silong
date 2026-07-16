import { useCallback, useMemo, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { Page, PageSnapshot } from "@/shared/types/domain";

/** Map a raw Convex snapshot row → the frontend PageSnapshot shape. Boundary
 *  cast (`any`) so the loose stored cover union widens to CoverField, matching
 *  the pre-refactor mapper. Shared by the per-page hook + the backup export. */
export function toPageSnapshot(s: any): PageSnapshot {
  return {
    id: s._id,
    pageId: s.pageId,
    authorId: s.authorId,
    authorName: s.authorName,
    takenAt: s.takenAt,
    title: s.title,
    icon: s.icon,
    cover: s.cover,
    blocks: s.blocks,
    rowProps: s.rowProps,
  };
}

/** Per-page snapshot subscription. Replaces the old always-mounted global
 *  `listAll` sub, which downloaded up to 500 snapshots — each carrying a full
 *  page-blocks copy — to every tab on boot AND re-broadcast the entire history
 *  every ~90s during editing (each `snapshotIfNeeded` insert invalidated the
 *  by_user read set). Now only the open page's version-history / analytics
 *  subscribes, to a bounded 50-row per-page query. Pass undefined to skip. */
export function useSnapshotsForPage(pageId: string | undefined): PageSnapshot[] {
  const raw = useQuery(
    api.snapshots.listForPage,
    pageId ? { pageId: pageId as Id<"pages"> } : "skip",
  );
  return useMemo(() => (raw ?? []).map(toPageSnapshot), [raw]);
}

export function useSnapshots(authorName: string) {
  const mutCreateSnapshot = useMutation(api.snapshots.create);
  const mutRestoreSnapshot = useMutation(api.snapshots.restore);
  const lastSnapshotRef = useRef<Record<string, number>>({});

  const snapshotIfNeeded = useCallback(
    (pageId: string, page: Page) => {
      const last = lastSnapshotRef.current[pageId] ?? 0;
      const now = Date.now();
      if (now - last < 90_000) return;
      lastSnapshotRef.current[pageId] = now;
      // Fire-and-forget. Wrapped in try/catch + .catch so a schema
      // mismatch or transient failure never blocks the page write
      // that triggered the snapshot, and never bubbles to the user.
      try {
        mutCreateSnapshot({
          pageId: pageId as Id<"pages">,
          authorName,
          takenAt: now,
          title: page.title,
          icon: page.icon,
          cover: page.cover ?? null,
          blocks: structuredClone(page.blocks),
          rowProps: page.rowProps ? structuredClone(page.rowProps) : undefined,
        }).catch((err) => {
          // Surface to dev console only — snapshots are advisory.
          console.warn("[snapshotIfNeeded] failed", err);
        });
      } catch (err) {
        console.warn("[snapshotIfNeeded] sync throw", err);
      }
    },
    [authorName, mutCreateSnapshot],
  );

  const restoreSnapshot = useCallback(
    (snapshotId: string) => {
      mutRestoreSnapshot({ snapshotId: snapshotId as Id<"snapshots"> });
    },
    [mutRestoreSnapshot],
  );

  // Stable identity so the store context value memo isn't invalidated every
  // render — inner deps are all memo/useCallback-stable.
  return useMemo(
    () => ({ restoreSnapshot, snapshotIfNeeded }),
    [restoreSnapshot, snapshotIfNeeded],
  );
}
