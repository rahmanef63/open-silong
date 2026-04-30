import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { useComments } from "@/slices/comments";
import type { Page, Block } from "@/lib/types";
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
  const { snapshotsForPage, childrenOf } = useStore();
  const { items: comments } = useComments(page ? { pageId: page.id } : { pageId: undefined });
  return useMemo(() => {
    if (!page) return null;
    const stats = walkBlocks(page.blocks);
    const snapshots = snapshotsForPage(page.id);
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
  }, [page, snapshotsForPage, childrenOf, comments.length]);
}
