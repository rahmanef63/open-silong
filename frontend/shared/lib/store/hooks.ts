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

export function useUser() {
  const s = useStore();
  return { user: s.user, updateUser: s.updateUser };
}

export function usePreferences() {
  const s = useStore();
  return { preferences: s.preferences, updatePreferences: s.updatePreferences };
}

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

export function useRecents() {
  const s = useStore();
  return { recents: s.recents, pushRecent: s.pushRecent };
}

export function useBlocks() {
  const s = useStore();
  return {
    addBlock: s.addBlock,
    updateBlock: s.updateBlock,
    deleteBlock: s.deleteBlock,
    duplicateBlock: s.duplicateBlock,
    moveBlock: s.moveBlock,
    reorderBlocks: s.reorderBlocks,
    setBlockType: s.setBlockType,
    replaceBlock: s.replaceBlock,
  };
}

export function useDatabases() {
  const s = useStore();
  return {
    databases: s.databases,
    trashedDatabases: s.trashedDatabases,
    getDatabase: s.getDatabase,
    createDatabase: s.createDatabase,
    updateDatabase: s.updateDatabase,
    trashDatabase: s.trashDatabase,
    restoreDatabase: s.restoreDatabase,
    permanentlyDeleteDatabase: s.permanentlyDeleteDatabase,
    addDatabaseFromTable: s.addDatabaseFromTable,
  };
}

export function useDatabaseProperties() {
  const s = useStore();
  return {
    addProperty: s.addProperty,
    updateProperty: s.updateProperty,
    deleteProperty: s.deleteProperty,
    reorderProperties: s.reorderProperties,
    addSelectOption: s.addSelectOption,
    updateSelectOption: s.updateSelectOption,
    deleteSelectOption: s.deleteSelectOption,
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

export function useDatabaseViews() {
  const s = useStore();
  return {
    addView: s.addView,
    updateView: s.updateView,
    deleteView: s.deleteView,
  };
}

export function useSnapshotsStore() {
  const s = useStore();
  return {
    snapshots: s.snapshots,
    snapshotsForPage: s.snapshotsForPage,
    restoreSnapshot: s.restoreSnapshot,
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

export function useAuth() {
  const s = useStore();
  return { signOut: s.signOut, saving: s.saving };
}
