import { useEffect, type MutableRefObject } from "react";
import type { Block } from "@/shared/types/domain";

interface Params {
  pageId: string | undefined;
  blocksRef: MutableRefObject<Block[] | undefined>;
  updatePage: (id: string, patch: { blocks: Block[] }) => void;
}

/** Cmd/Ctrl+Shift+ArrowUp/Down reorders the currently-focused top-level block. */
export function useBlockMoveShortcut({ pageId, blocksRef, updatePage }: Params) {
  useEffect(() => {
    if (!pageId) return;
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta || !e.shiftKey) return;
      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
      const ae = document.activeElement as HTMLElement | null;
      if (!ae) return;
      const host = ae.closest<HTMLElement>("[data-block-id]");
      if (!host) return;
      const blockId = host.getAttribute("data-block-id");
      const blocks = blocksRef.current;
      if (!blockId || !blocks) return;
      const idx = blocks.findIndex((b) => b.id === blockId);
      if (idx === -1) return;
      const dir = e.key === "ArrowUp" ? -1 : 1;
      const target = idx + dir;
      if (target < 0 || target >= blocks.length) return;
      e.preventDefault();
      const next = blocks.slice();
      const [item] = next.splice(idx, 1);
      next.splice(target, 0, item);
      updatePage(pageId, { blocks: next });
      window.setTimeout(() => {
        document.querySelector<HTMLElement>(`[data-block-id="${blockId}"]`)?.focus();
      }, 30);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [pageId, updatePage, blocksRef]);
}
