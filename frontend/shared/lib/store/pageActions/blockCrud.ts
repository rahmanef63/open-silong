import { useCallback, useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Block, BlockType, Page } from "@/shared/types/domain";
import { guardMut, guardMutVoid } from "../mutationGuard";
import { uid, type StructuralAction } from "./constants";

interface Args {
  pageMap: Map<string, Page>;
  pushStructuralAction: (a: StructuralAction) => void;
  mutUpdatePage: (args: { pageId: string; patch: Partial<Page> }) => void;
}

const TEXT_ONLY_KEYS = new Set(["text", "caption"]);
const isTextOnlyPatch = (patch: Partial<Block>) =>
  Object.keys(patch).length > 0 && Object.keys(patch).every((k) => TEXT_ONLY_KEYS.has(k));

export function useBlockCrud({ pageMap, pushStructuralAction, mutUpdatePage }: Args) {
  const mutAddBlock = useMutation(api.pages.addBlock);
  const mutUpdateBlock = useMutation(api.pages.updateBlock);
  const mutDeleteBlock = useMutation(api.pages.deleteBlock);
  const mutReorderBlocks = useMutation(api.pages.reorderBlocks);

  const addBlock = useCallback(
    async (pageId: string, afterIndex: number, type: BlockType = "paragraph", init: Partial<Block> = {}): Promise<string> => {
      return await guardMut("addBlock", mutAddBlock({ pageId, afterIndex, type, init }));
    },
    [mutAddBlock],
  );

  // Debounced text-only block writes — typing produces ~6 mutations/sec
  // otherwise. Structural changes (type swap, checkbox toggle, code lang)
  // flush immediately. Pending patches are coalesced per block (last write
  // wins for text). Flushed on blur/unmount via flushAllPendingBlocks.
  const pendingBlockWrites = useRef<Map<string, { pageId: string; blockId: string; patch: Partial<Block>; timer: number }>>(new Map());

  const flushBlockKey = useCallback((key: string) => {
    const entry = pendingBlockWrites.current.get(key);
    if (!entry) return;
    window.clearTimeout(entry.timer);
    pendingBlockWrites.current.delete(key);
    guardMutVoid("updateBlock", mutUpdateBlock({ pageId: entry.pageId, blockId: entry.blockId, patch: entry.patch }));
  }, [mutUpdateBlock]);

  const flushAllPendingBlocks = useCallback(() => {
    for (const key of Array.from(pendingBlockWrites.current.keys())) flushBlockKey(key);
  }, [flushBlockKey]);

  // Flush on tab close / route change so pending text isn't lost.
  useEffect(() => {
    const onHide = () => flushAllPendingBlocks();
    window.addEventListener("beforeunload", onHide);
    window.addEventListener("pagehide", onHide);
    return () => {
      flushAllPendingBlocks();
      window.removeEventListener("beforeunload", onHide);
      window.removeEventListener("pagehide", onHide);
    };
  }, [flushAllPendingBlocks]);

  const updateBlock = useCallback(
    (pageId: string, blockId: string, patch: Partial<Block>) => {
      const key = `${pageId}:${blockId}`;
      if (!isTextOnlyPatch(patch)) {
        flushBlockKey(key);
        guardMutVoid("updateBlock", mutUpdateBlock({ pageId, blockId, patch }));
        return;
      }
      const existing = pendingBlockWrites.current.get(key);
      const merged = { ...(existing?.patch ?? {}), ...patch };
      if (existing) window.clearTimeout(existing.timer);
      const timer = window.setTimeout(() => flushBlockKey(key), 250);
      pendingBlockWrites.current.set(key, { pageId, blockId, patch: merged, timer });
    },
    [flushBlockKey, mutUpdateBlock],
  );

  const deleteBlock = useCallback(
    (pageId: string, blockId: string) => { guardMutVoid("deleteBlock", mutDeleteBlock({ pageId, blockId })); },
    [mutDeleteBlock],
  );

  const duplicateBlock = useCallback(
    (pageId: string, blockId: string) => {
      const page = pageMap.get(pageId);
      if (!page) return undefined;
      const idx = page.blocks.findIndex((b) => b.id === blockId);
      if (idx === -1) return undefined;
      const dup = { ...page.blocks[idx], id: uid() };
      const blocks = [...page.blocks];
      blocks.splice(idx + 1, 0, dup);
      mutUpdatePage({ pageId, patch: { blocks } });
      return dup.id;
    },
    [pageMap, mutUpdatePage],
  );

  const moveBlock = useCallback(
    (pageId: string, fromIndex: number, toIndex: number) => {
      const page = pageMap.get(pageId);
      if (!page) return;
      const blocks = [...page.blocks];
      const [moved] = blocks.splice(fromIndex, 1);
      blocks.splice(toIndex, 0, moved);
      const before = [...page.blocks];
      const after = [...blocks];
      pushStructuralAction({
        label: "Move block",
        undo: () => mutUpdatePage({ pageId, patch: { blocks: before } }),
        redo: () => mutUpdatePage({ pageId, patch: { blocks: after } }),
      });
      mutUpdatePage({ pageId, patch: { blocks } });
    },
    [pageMap, mutUpdatePage, pushStructuralAction],
  );

  const reorderBlocks = useCallback(
    (pageId: string, orderedIds: string[]) => {
      const page = pageMap.get(pageId);
      if (!page) return;
      const oldIds = page.blocks.map((b) => b.id);
      const same = oldIds.length === orderedIds.length && oldIds.every((id, i) => id === orderedIds[i]);
      if (same) return;
      pushStructuralAction({
        label: "Reorder blocks",
        undo: () => mutReorderBlocks({ pageId, orderedIds: oldIds }),
        redo: () => mutReorderBlocks({ pageId, orderedIds }),
      });
      mutReorderBlocks({ pageId, orderedIds });
    },
    [pageMap, mutReorderBlocks, pushStructuralAction],
  );

  const setBlockType = useCallback(
    (pageId: string, blockId: string, type: BlockType) => {
      mutUpdateBlock({ pageId, blockId, patch: { type, checked: type === "todo" ? false : undefined } });
    },
    [mutUpdateBlock],
  );

  const replaceBlock = useCallback(
    (pageId: string, blockId: string, next: Block) => {
      const page = pageMap.get(pageId);
      if (!page) return;
      const blocks = page.blocks.map((b) => (b.id === blockId ? { ...next, id: blockId } : b));
      mutUpdatePage({ pageId, patch: { blocks } });
    },
    [pageMap, mutUpdatePage],
  );

  return {
    addBlock, updateBlock, deleteBlock, duplicateBlock,
    moveBlock, reorderBlocks, setBlockType, replaceBlock,
  };
}
