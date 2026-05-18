import { useCallback, useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { Block, BlockType, Page } from "@/shared/types/domain";
import { guardMut, guardMutVoid } from "../mutationGuard";
import { uid, type StructuralAction } from "./constants";

// Loosely typed mutUpdatePage — Convex ReactMutation has a precisely-branded
// patch shape (Id<"pages"> for parentId etc.) but this hook only passes
// `{ blocks }`. Typed as `any` to bypass invariance at the prop boundary.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UpdatePageFn = (args: { pageId: Id<"pages">; patch: any }) => unknown;

interface Args {
  pageMap: Map<string, Page>;
  pushStructuralAction: (a: StructuralAction) => void;
  mutUpdatePage: UpdatePageFn;
}

/** Local cast helper — frontend `Page.id` is `string` for convenience;
 *  Convex requires the branded `Id<"pages">`. Boundary cast lives here. */
const asPageId = (s: string): Id<"pages"> => s as Id<"pages">;

const TEXT_ONLY_KEYS = new Set(["text", "caption"]);
const isTextOnlyPatch = (patch: Partial<Block>) =>
  Object.keys(patch).length > 0 && Object.keys(patch).every((k) => TEXT_ONLY_KEYS.has(k));

export function useBlockCrud({ pageMap, pushStructuralAction, mutUpdatePage }: Args) {
  const mutAddBlock = useMutation(api.pages.addBlock);
  // Optimistic update: patch the local pages.getById query result so the
  // UI reflects the change before the server round-trip completes.
  // Critical for view-switch / color / activeViewId edits where the
  // patch lands on a block already onscreen — server roundtrip adds
  // perceived latency even when convex IS realtime.
  const mutUpdateBlock = useMutation(api.pages.updateBlock).withOptimisticUpdate(
    (localStore, args) => {
      const cur = localStore.getQuery(api.pages.getById, { id: args.pageId });
      if (!cur) return;
      const blocks = (cur as { blocks: Array<{ id: string; [k: string]: unknown }> }).blocks
        .map((b) => b.id === args.blockId ? { ...b, ...args.patch } : b);
      localStore.setQuery(api.pages.getById, { id: args.pageId }, { ...cur, blocks });
    },
  );
  const mutDeleteBlock = useMutation(api.pages.deleteBlock);
  const mutReorderBlocks = useMutation(api.pages.reorderBlocks).withOptimisticUpdate(
    (localStore, args) => {
      const cur = localStore.getQuery(api.pages.getById, { id: args.pageId });
      if (!cur) return;
      const blocksMap = new Map(
        (cur as { blocks: Array<{ id: string }> }).blocks.map((b) => [b.id, b]),
      );
      const blocks = args.orderedIds.map((id) => blocksMap.get(id)).filter(Boolean);
      localStore.setQuery(api.pages.getById, { id: args.pageId }, { ...cur, blocks });
    },
  );

  const addBlock = useCallback(
    async (pageId: string, afterIndex: number, type: BlockType = "paragraph", init: Partial<Block> = {}): Promise<string> => {
      return await guardMut("addBlock", mutAddBlock({ pageId: asPageId(pageId), afterIndex, type, init }));
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
    guardMutVoid("updateBlock", mutUpdateBlock({ pageId: asPageId(entry.pageId), blockId: entry.blockId, patch: entry.patch }));
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
        guardMutVoid("updateBlock", mutUpdateBlock({ pageId: asPageId(pageId), blockId, patch }));
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
    (pageId: string, blockId: string) => { guardMutVoid("deleteBlock", mutDeleteBlock({ pageId: asPageId(pageId), blockId })); },
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
      mutUpdatePage({ pageId: asPageId(pageId), patch: { blocks } });
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
        undo: () => mutUpdatePage({ pageId: asPageId(pageId), patch: { blocks: before } }),
        redo: () => mutUpdatePage({ pageId: asPageId(pageId), patch: { blocks: after } }),
      });
      mutUpdatePage({ pageId: asPageId(pageId), patch: { blocks } });
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
        undo: () => mutReorderBlocks({ pageId: asPageId(pageId), orderedIds: oldIds }),
        redo: () => mutReorderBlocks({ pageId: asPageId(pageId), orderedIds }),
      });
      mutReorderBlocks({ pageId: asPageId(pageId), orderedIds });
    },
    [pageMap, mutReorderBlocks, pushStructuralAction],
  );

  const setBlockType = useCallback(
    (pageId: string, blockId: string, type: BlockType) => {
      mutUpdateBlock({ pageId: asPageId(pageId), blockId, patch: { type, checked: type === "todo" ? false : undefined } });
    },
    [mutUpdateBlock],
  );

  const replaceBlock = useCallback(
    (pageId: string, blockId: string, next: Block) => {
      const page = pageMap.get(pageId);
      if (!page) return;
      const blocks = page.blocks.map((b) => (b.id === blockId ? { ...next, id: blockId } : b));
      mutUpdatePage({ pageId: asPageId(pageId), patch: { blocks } });
    },
    [pageMap, mutUpdatePage],
  );

  return {
    addBlock, updateBlock, deleteBlock, duplicateBlock,
    moveBlock, reorderBlocks, setBlockType, replaceBlock,
  };
}
