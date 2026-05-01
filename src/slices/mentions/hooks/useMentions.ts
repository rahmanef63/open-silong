import { useMemo } from "react";
import { useStore } from "@/shared/lib/store";
import type { Block, Page } from "@/shared/types/domain";
import type { Mention } from "../types";

const MENTION_RE = /@([a-zA-Z0-9_]+)/g;

function scanBlocks(page: Page, blocks: Block[], handle: string, out: Mention[]): void {
  for (const b of blocks) {
    const t = b.text ?? "";
    if (t) {
      MENTION_RE.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = MENTION_RE.exec(t)) !== null) {
        if (handle && m[1].toLowerCase() !== handle.toLowerCase()) continue;
        out.push({
          pageId: page.id,
          pageTitle: page.title || "Untitled",
          pageIcon: page.icon,
          blockId: b.id,
          excerpt: t.slice(Math.max(0, m.index - 32), m.index + 64),
          handle: m[1],
        });
      }
    }
    if (b.children) scanBlocks(page, b.children, handle, out);
    if (b.columns) b.columns.forEach((col) => scanBlocks(page, col, handle, out));
  }
}

/**
 * Mentions of a given handle across all pages. With no handle, returns
 * every `@mention` in the workspace.
 */
export function useMentions(handle: string = ""): Mention[] {
  const { pages } = useStore();
  return useMemo(() => {
    const out: Mention[] = [];
    for (const p of pages) {
      if (p.trashed) continue;
      scanBlocks(p, p.blocks, handle, out);
    }
    return out;
  }, [pages, handle]);
}
