import type { Page, Preferences } from "@/shared/types/domain";
import { type StructuralAction } from "./pageActions/constants";
import { useChildrenIndex } from "./pageActions/childrenIndex";
import { usePageCrud } from "./pageActions/pageCrud";
import { useBlockCrud } from "./pageActions/blockCrud";
import { useSearchAndTrash } from "./pageActions/searchTrash";

interface Args {
  pages: Page[];
  pageMap: Map<string, Page>;
  preferences: Preferences;
  snapshotIfNeeded: (pageId: string, page: Page) => void;
  pushStructuralAction: (a: StructuralAction) => void;
}

export function usePageActions({
  pages, pageMap, preferences, snapshotIfNeeded, pushStructuralAction,
}: Args) {
  const { childrenOf } = useChildrenIndex(pages, preferences);
  const pageCrud = usePageCrud({ pages, pageMap, snapshotIfNeeded, pushStructuralAction });
  const blockCrud = useBlockCrud({
    pageMap,
    pushStructuralAction,
    mutUpdatePage: pageCrud.mutUpdatePage,
  });
  const searchTrash = useSearchAndTrash(pages);

  return {
    childrenOf,
    getPage: pageCrud.getPage,
    createPage: pageCrud.createPage,
    updatePage: pageCrud.updatePage,
    movePage: pageCrud.movePage,
    reorderPages: pageCrud.reorderPages,
    reorderRootPages: pageCrud.reorderRootPages,
    deletePage: pageCrud.deletePage,
    restorePage: pageCrud.restorePage,
    permanentlyDelete: pageCrud.permanentlyDelete,
    duplicatePage: pageCrud.duplicatePage,
    toggleFavorite: pageCrud.toggleFavorite,
    togglePublic: pageCrud.togglePublic,
    ...blockCrud,
    ...searchTrash,
  };
}
