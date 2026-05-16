import { useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Page } from "@/shared/types/domain";
import { guardMut, guardMutVoid } from "../mutationGuard";
import { DEFAULT_PAGE_ICON } from "@/shared/components/icon-picker";
import { uid, type StructuralAction } from "./constants";

interface Args {
  pages: Page[];
  pageMap: Map<string, Page>;
  snapshotIfNeeded: (pageId: string, page: Page) => void;
  pushStructuralAction: (a: StructuralAction) => void;
}

export function usePageCrud({ pages, pageMap, snapshotIfNeeded, pushStructuralAction }: Args) {
  const mutCreatePage = useMutation(api.pages.create);
  const mutUpdatePage = useMutation(api.pages.update);
  const mutSetPublic = useMutation(api.pages.setPublic);
  const mutTrashPage = useMutation(api.pages.trash);
  const mutRestorePage = useMutation(api.pages.restore);
  const mutPermanentlyDelete = useMutation(api.pages.permanentlyDelete);
  const mutDuplicatePage = useMutation(api.pages.duplicate);

  const getPage = useCallback((id: string) => pageMap.get(id), [pageMap]);

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
        icon: opts.icon ?? DEFAULT_PAGE_ICON,
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
      return { id: newId, parentId: null, title: "", icon: DEFAULT_PAGE_ICON, cover: null, blocks: [], favorite: false, trashed: false, createdAt: now, updatedAt: now };
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

  return {
    getPage, createPage, updatePage, movePage, reorderPages, reorderRootPages,
    deletePage, restorePage, permanentlyDelete, duplicatePage,
    toggleFavorite, togglePublic,
    mutUpdatePage,
  };
}
