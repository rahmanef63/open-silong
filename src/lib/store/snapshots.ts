import { useCallback, useMemo, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Page, PageSnapshot } from "../types";

export function useSnapshots(authorName: string) {
  const rawSnapshots = useQuery(api.snapshots.listAll) ?? [];
  const mutCreateSnapshot = useMutation(api.snapshots.create);
  const mutRestoreSnapshot = useMutation(api.snapshots.restore);
  const lastSnapshotRef = useRef<Record<string, number>>({});

  const snapshots: PageSnapshot[] = useMemo(
    () =>
      rawSnapshots.map((s: any) => ({
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
      })),
    [rawSnapshots],
  );

  const snapshotsByPage = useMemo(() => {
    const map = new Map<string, PageSnapshot[]>();
    for (const s of snapshots) {
      const arr = map.get(s.pageId) ?? [];
      arr.push(s);
      map.set(s.pageId, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => b.takenAt - a.takenAt);
    return map;
  }, [snapshots]);

  const EMPTY: PageSnapshot[] = useMemo(() => [], []);
  const snapshotsForPage = useCallback(
    (pageId: string) => snapshotsByPage.get(pageId) ?? EMPTY,
    [snapshotsByPage, EMPTY],
  );

  const snapshotIfNeeded = useCallback(
    (pageId: string, page: Page) => {
      const last = lastSnapshotRef.current[pageId] ?? 0;
      const now = Date.now();
      if (now - last < 90_000) return;
      lastSnapshotRef.current[pageId] = now;
      mutCreateSnapshot({
        pageId,
        authorName,
        takenAt: now,
        title: page.title,
        icon: page.icon,
        cover: page.cover ?? null,
        blocks: JSON.parse(JSON.stringify(page.blocks)),
        rowProps: page.rowProps ? JSON.parse(JSON.stringify(page.rowProps)) : undefined,
      });
    },
    [authorName, mutCreateSnapshot],
  );

  const restoreSnapshot = useCallback(
    (snapshotId: string) => {
      mutRestoreSnapshot({ snapshotId });
    },
    [mutRestoreSnapshot],
  );

  return { snapshots, snapshotsForPage, restoreSnapshot, snapshotIfNeeded };
}
