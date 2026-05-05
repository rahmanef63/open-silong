import { useCallback, useEffect, useMemo, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Block, BlockType, Page, Preferences } from "@/shared/types/domain";
import { guardMut, guardMutVoid } from "./mutationGuard";

const uid = () => Math.random().toString(36).slice(2, 10);

interface Args {
  pages: Page[];
  pageMap: Map<string, Page>;
  preferences: Preferences;
  snapshotIfNeeded: (pageId: string, page: Page) => void;
  pushStructuralAction: (a: { label: string; undo: () => void; redo: () => void }) => void;
}

export function usePageActions({ pages, pageMap, preferences, snapshotIfNeeded, pushStructuralAction }: Args) {
  const mutCreatePage = useMutation(api.pages.create);
  const mutUpdatePage = useMutation(api.pages.update);
  const mutSetPublic = useMutation(api.pages.setPublic);
  const mutTrashPage = useMutation(api.pages.trash);
  const mutRestorePage = useMutation(api.pages.restore);
  const mutPermanentlyDelete = useMutation(api.pages.permanentlyDelete);
  const mutDuplicatePage = useMutation(api.pages.duplicate);
  const mutAddBlock = useMutation(api.pages.addBlock);
  const mutUpdateBlock = useMutation(api.pages.updateBlock);
  const mutDeleteBlock = useMutation(api.pages.deleteBlock);
  const mutReorderBlocks = useMutation(api.pages.reorderBlocks);
  const mutPushRecent = useMutation(api.recents.push);
  const mutUpsertPrefs = useMutation(api.preferences.upsert);

  const getPage = useCallback((id: string) => pageMap.get(id), [pageMap]);

  const childrenByParent = useMemo(() => {
    const map = new Map<string | null, Page[]>();
    for (const p of pages) {
      if (p.trashed || p.rowOfDatabaseId) continue;
      const arr = map.get(p.parentId) ?? [];
      arr.push(p);
      map.set(p.parentId, arr);
    }
    const cmp = (a: Page, b: Page) => {
      switch (preferences.defaultPageSort) {
        case "title":   return a.title.localeCompare(b.title);
        case "updated": return b.updatedAt - a.updatedAt;
        case "created": return a.createdAt - b.createdAt;
        default:        return a.createdAt - b.createdAt;
      }
    };
    for (const arr of map.values()) arr.sort(cmp);
    return map;
  }, [pages, preferences.defaultPageSort]);

  const EMPTY: Page[] = useMemo(() => [], []);
  const childrenOf = useCallback(
    (parentId: string | null) => childrenByParent.get(parentId) ?? EMPTY,
    [childrenByParent, EMPTY],
  );

  const createPage = useCallback(
    async (parentId: string | null = null, opts: Partial<Page> = {}): Promise<Page> => {
      const id = await guardMut("createPage", mutCreatePage({
        parentId,
        title: opts.title,
        icon: opts.icon,
        rowOfDatabaseId: opts.rowOfDatabaseId,
      }));
      const now = Date.now();
      return {
        id, parentId,
        title: opts.title ?? "",
        icon: opts.icon ?? "📄",
        cover: null,
        blocks: [{ id: uid(), type: "paragraph", text: "" }],
        favorite: false, trashed: false,
        createdAt: now, updatedAt: now,
        ...opts,
      };
    },
    [mutCreatePage],
  );

  const updatePage = useCallback(
    (id: string, patch: Partial<Page>) => {
      const page = pageMap.get(id);
      if (page) snapshotIfNeeded(id, page);
      guardMutVoid("updatePage", mutUpdatePage({ pageId: id, patch }));
    },
    [pageMap, mutUpdatePage, snapshotIfNeeded],
  );

  const movePage = useCallback(
    (id: string, newParentId: string | null) => {
      const page = pageMap.get(id);
      if (!page || page.parentId === newParentId) return;
      const before = { parentId: page.parentId, createdAt: page.createdAt };
      const after = { parentId: newParentId, createdAt: Date.now() };
      pushStructuralAction({
        label: "Move page",
        undo: () => mutUpdatePage({ pageId: id, patch: before }),
        redo: () => mutUpdatePage({ pageId: id, patch: after }),
      });
      mutUpdatePage({ pageId: id, patch: after });
    },
    [pageMap, mutUpdatePage, pushStructuralAction],
  );

  const reorderPages = useCallback(
    (parentId: string | null, orderedIds: string[]) => {
      const localPageMap = new Map(pages.map((p) => [p.id, p]));
      const affected = orderedIds.map((id) => localPageMap.get(id)).filter((p): p is Page => !!p);
      if (!affected.length) return;
      const before = affected.map((p) => ({ id: p.id, parentId: p.parentId, createdAt: p.createdAt }));
      const base = Date.now();
      const after = orderedIds.map((id, i) => ({ id, parentId, createdAt: base + i }));
      const orderedSet = new Set(orderedIds);
      const currentOrder = pages
        .filter((p) => orderedSet.has(p.id) && p.parentId === parentId)
        .sort((a, b) => a.createdAt - b.createdAt)
        .map((p) => p.id);
      const same = currentOrder.length === orderedIds.length && currentOrder.every((cid, i) => cid === orderedIds[i]);
      if (same) return;
      const apply = (states: Array<{ id: string; parentId: string | null; createdAt: number }>) => {
        states.forEach((state) => mutUpdatePage({ pageId: state.id, patch: { parentId: state.parentId, createdAt: state.createdAt } }));
      };
      pushStructuralAction({ label: "Reorder pages", undo: () => apply(before), redo: () => apply(after) });
      apply(after);
    },
    [pages, mutUpdatePage, pushStructuralAction],
  );

  const reorderRootPages = useCallback(
    (orderedIds: string[]) => reorderPages(null, orderedIds),
    [reorderPages],
  );

  const deletePage = useCallback((id: string) => { guardMutVoid("trashPage", mutTrashPage({ pageId: id })); }, [mutTrashPage]);
  const restorePage = useCallback((id: string) => { guardMutVoid("restorePage", mutRestorePage({ pageId: id })); }, [mutRestorePage]);
  const permanentlyDelete = useCallback((id: string) => { guardMutVoid("permanentlyDelete", mutPermanentlyDelete({ pageId: id })); }, [mutPermanentlyDelete]);

  const duplicatePage = useCallback(
    async (id: string): Promise<Page | undefined> => {
      const newId = await guardMut("duplicatePage", mutDuplicatePage({ pageId: id }));
      if (!newId) return undefined;
      const now = Date.now();
      return { id: newId, parentId: null, title: "", icon: "📄", cover: null, blocks: [], favorite: false, trashed: false, createdAt: now, updatedAt: now };
    },
    [mutDuplicatePage],
  );

  const toggleFavorite = useCallback(
    (id: string) => {
      const page = pageMap.get(id);
      if (page) mutUpdatePage({ pageId: id, patch: { favorite: !page.favorite } });
    },
    [pageMap, mutUpdatePage],
  );

  const togglePublic = useCallback(
    (id: string) => {
      const page = pageMap.get(id);
      if (page) mutSetPublic({ pageId: id, isPublic: !page.isPublic });
    },
    [pageMap, mutSetPublic],
  );

  const addBlock = useCallback(
    async (pageId: string, afterIndex: number, type: BlockType = "paragraph", init: Partial<Block> = {}): Promise<string> => {
      return await guardMut("addBlock", mutAddBlock({ pageId, afterIndex, type, init }));
    },
    [mutAddBlock],
  );

  // Debounced text-only block writes — typing produces ~6 mutations/sec
  // otherwise. Structural changes (type swap, checkbox toggle, code lang)
  // flush immediately. Pending patches are coalesced per block (last write
  // wins for text). Flushed on blur/unmount via flushPendingBlocks.
  const pendingBlockWrites = useRef<Map<string, { pageId: string; blockId: string; patch: Partial<Block>; timer: number }>>(new Map());
  const TEXT_ONLY_KEYS = new Set(["text", "caption"]);
  const isTextOnlyPatch = (patch: Partial<Block>) =>
    Object.keys(patch).length > 0 && Object.keys(patch).every((k) => TEXT_ONLY_KEYS.has(k));

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
        // Structural change — flush any queued text first, then write.
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

  const pushRecent = useCallback(
    (id: string) => {
      guardMutVoid("pushRecent", mutPushRecent({ pageId: id }));
      guardMutVoid("upsertPrefs", mutUpsertPrefs({ patch: { lastOpenedPageId: id } }));
    },
    [mutPushRecent, mutUpsertPrefs],
  );

  const trash = useMemo(() => pages.filter((p) => p.trashed), [pages]);

  const search = useCallback(
    (q: string) => {
      const s = q.trim().toLowerCase();
      if (!s) return [];
      return pages
        .filter((p) =>
          !p.trashed && (p.title.toLowerCase().includes(s) || p.blocks.some((b) => b.text.toLowerCase().includes(s))),
        )
        .slice(0, 20);
    },
    [pages],
  );

  return {
    getPage, childrenOf, createPage, updatePage, movePage, reorderPages, reorderRootPages,
    deletePage, restorePage, permanentlyDelete, duplicatePage,
    toggleFavorite, togglePublic,
    addBlock, updateBlock, deleteBlock, duplicateBlock, moveBlock, reorderBlocks, setBlockType, replaceBlock,
    pushRecent, trash, search,
  };
}
