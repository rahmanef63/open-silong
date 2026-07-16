import { useMemo } from "react";
import { useStore, useSnapshotsForPage } from "@/shared/lib/store";
import { usePageComments } from "@/slices/comments";
import type { Page, Block } from "@/shared/types/domain";
import type { PageAnalytics } from "../types";

function walkBlocks(blocks: Block[]): { count: number; chars: number; words: number } {
  let count = 0;
  let chars = 0;
  let words = 0;
  const visit = (bs: Block[]) => {
    for (const b of bs) {
      count += 1;
      const t = b.text ?? "";
      chars += t.length;
      words += t.trim() ? t.trim().split(/\s+/).length : 0;
      if (b.children) visit(b.children);
      if (b.columns) b.columns.forEach(visit);
    }
  };
  visit(blocks);
  return { count, chars, words };
}

export function usePageAnalytics(page: Page | undefined): PageAnalytics | null {
  const { childrenOf } = useStore();
  const snapshots = useSnapshotsForPage(page?.id);
  const { all: comments } = usePageComments();
  return useMemo(() => {
    if (!page) return null;
    const stats = walkBlocks(page.blocks);
    const subpages = childrenOf(page.id).length;
    const now = Date.now();
    return {
      pageId: page.id,
      blocks: stats.count,
      characters: stats.chars,
      words: stats.words,
      subpages,
      edits: snapshots.length,
      ageMs: now - page.createdAt,
      lastEditMs: now - page.updatedAt,
      snapshotCount: snapshots.length,
      commentCount: comments.length,
    };
  }, [page, snapshots, childrenOf, comments.length]);
}
