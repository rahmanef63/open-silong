"use client";

/**
 * Per-domain selector hooks over the monolithic StoreCtx.
 *
 * The legacy `useStore()` returns the entire context (60+ fields). Adopting
 * these slim hooks gives downstream consumers a tighter import surface without
 * forcing a big-bang refactor of the existing useStore call-sites.
 *
 * All of these subscribe to the same React context — they don't reduce
 * re-renders. The win is API clarity + per-domain copyability.
 */

import { useStore } from "./context";

export function useWorkspaces() {
  const s = useStore();
  return {
    workspace: s.workspace,
    workspaces: s.workspaces,
    updateWorkspace: s.updateWorkspace,
    setActiveWorkspace: s.setActiveWorkspace,
    createWorkspace: s.createWorkspace,
    deleteWorkspace: s.deleteWorkspace,
    leaveWorkspace: s.leaveWorkspace,
  };
}

export function usePages() {
  const s = useStore();
  return {
    pages: s.pages,
    trash: s.trash,
    isInitialLoading: s.isInitialLoading,
    getPage: s.getPage,
    childrenOf: s.childrenOf,
    createPage: s.createPage,
    updatePage: s.updatePage,
    movePage: s.movePage,
    reorderPages: s.reorderPages,
    reorderRootPages: s.reorderRootPages,
    deletePage: s.deletePage,
    restorePage: s.restorePage,
    permanentlyDelete: s.permanentlyDelete,
    duplicatePage: s.duplicatePage,
    toggleFavorite: s.toggleFavorite,
    togglePublic: s.togglePublic,
    search: s.search,
  };
}

export function useDatabaseRows() {
  const s = useStore();
  return {
    addRow: s.addRow,
    deleteRow: s.deleteRow,
    reorderRows: s.reorderRows,
    setRowValue: s.setRowValue,
    setRelationTwoWay: s.setRelationTwoWay,
  };
}

export function useUndoRedo() {
  const s = useStore();
  return {
    undo: s.undo,
    redo: s.redo,
    canUndo: s.canUndo,
    canRedo: s.canRedo,
  };
}
