import { useMemo } from "react";
import { useStore } from "@/shared/lib/store";
import type { Block, Page } from "@/shared/types/domain";

export interface Backlink {
  pageId: string;
  pageTitle: string;
  pageIcon: string;
  blockId: string;
  preview: string;
  kind: "page-link" | "mention";
}

function* walk(blocks: Block[]): Generator<Block> {
  for (const b of blocks) {
    yield b;
    if (b.children) yield* walk(b.children);
    if (b.columns) for (const col of b.columns) yield* walk(col);
  }
}

function trimPreview(text: string, max = 120): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > max ? t.slice(0, max - 1) + "…" : t;
}

export function useBacklinks(targetPageId: string | undefined): Backlink[] {
  const { pages, getPage } = useStore();

  return useMemo(() => {
    if (!targetPageId) return [];
    const target = getPage(targetPageId);
    if (!target) return [];
    const titleHandle = (target.title || "").trim();
    const found: Backlink[] = [];

    for (const p of pages) {
      if (p.id === targetPageId || p.trashed) continue;
      for (const b of walk(p.blocks)) {
        if (b.type === "page" && b.pageId === targetPageId) {
          found.push({
            pageId: p.id,
            pageTitle: p.title || "Untitled",
            pageIcon: p.icon,
            blockId: b.id,
            preview: trimPreview(b.text || target.title || "Page link"),
            kind: "page-link",
          });
          continue;
        }
        if (titleHandle && b.text) {
          const needle = `@${titleHandle.toLowerCase()}`;
          if (b.text.toLowerCase().includes(needle)) {
            found.push({
              pageId: p.id,
              pageTitle: p.title || "Untitled",
              pageIcon: p.icon,
              blockId: b.id,
              preview: trimPreview(b.text),
              kind: "mention",
            });
          }
        }
      }
    }

    const seen = new Set<string>();
    return found.filter((bl) => {
      const key = `${bl.pageId}:${bl.blockId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [pages, targetPageId, getPage]);
}
