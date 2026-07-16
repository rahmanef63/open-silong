"use client";

import { createContext, useContext } from "react";
import type {
  Block, BlockType, Page, Workspace, UserProfile, Preferences, Database,
  DatabaseViewConfig, Property, PropertyType, PropertyValue, SelectOption,
} from "@/shared/types/domain";

export interface StoreCtx {
  user: UserProfile;
  updateUser: (patch: Partial<UserProfile>) => void;
  preferences: Preferences;
  updatePreferences: (patch: Partial<Preferences>) => void;
  workspace: Workspace;
  updateWorkspace: (patch: Partial<Workspace>) => void;
  workspaces: Workspace[];
  setActiveWorkspace: (workspaceId: string) => Promise<void>;
  createWorkspace: (name: string, emoji?: string) => Promise<string>;
  deleteWorkspace: (workspaceId: string) => Promise<void>;
  leaveWorkspace: (workspaceId: string) => Promise<void>;
  pages: Page[];
  recents: string[];
  getPage: (id: string) => Page | undefined;
  childrenOf: (parentId: string | null) => Page[];
  createPage: (parentId?: string | null, opts?: Partial<Page>) => Promise<Page>;
  updatePage: (id: string, patch: Partial<Page>) => void;
  movePage: (id: string, newParentId: string | null) => void;
  reorderPages: (parentId: string | null, orderedIds: string[]) => void;
  reorderRootPages: (orderedIds: string[]) => void;
  deletePage: (id: string) => void;
  restorePage: (id: string) => void;
  permanentlyDelete: (id: string) => void;
  duplicatePage: (id: string) => Promise<Page | undefined>;
  toggleFavorite: (id: string) => void;
  togglePublic: (id: string) => void;
  addBlock: (pageId: string, afterIndex: number, type?: BlockType, init?: Partial<Block>) => Promise<string>;
  updateBlock: (pageId: string, blockId: string, patch: Partial<Block>) => void;
  deleteBlock: (pageId: string, blockId: string) => void;
  duplicateBlock: (pageId: string, blockId: string) => string | undefined;
  moveBlock: (pageId: string, fromIndex: number, toIndex: number) => void;
  reorderBlocks: (pageId: string, orderedIds: string[]) => void;
  setBlockType: (pageId: string, blockId: string, type: BlockType) => void;
  replaceBlock: (pageId: string, blockId: string, next: Block) => void;
  pushRecent: (id: string) => void;
  trash: Page[];
  search: (q: string) => Page[];
  saving: boolean;
  isInitialLoading: boolean;
  databases: Database[];
  trashedDatabases: Database[];
  getDatabase: (id: string) => Database | undefined;
  createDatabase: (name?: string, icon?: string) => Promise<Database>;
  updateDatabase: (id: string, patch: Partial<Database>) => void;
  trashDatabase: (id: string) => void;
  restoreDatabase: (id: string) => void;
  permanentlyDeleteDatabase: (id: string) => void;
  addDatabaseFromTable: (input: { headerRow: string[]; bodyRows: string[][] }) => Promise<string | null>;
  duplicateDatabase: (id: string, opts?: { includeRows?: boolean }) => Promise<string | null>;
  addProperty: (dbId: string, type: PropertyType, name?: string) => Property;
  duplicateProperty: (dbId: string, propId: string) => Property | null;
  updateProperty: (dbId: string, propId: string, patch: Partial<Property>) => void;
  deleteProperty: (dbId: string, propId: string) => void;
  reorderProperties: (dbId: string, orderedIds: string[]) => void;
  addSelectOption: (dbId: string, propId: string, name: string, color?: string) => SelectOption;
  updateSelectOption: (dbId: string, propId: string, optId: string, patch: Partial<SelectOption>) => void;
  deleteSelectOption: (dbId: string, propId: string, optId: string) => void;
  addRow: (dbId: string, init?: Partial<Page>, templateId?: string) => Promise<Page>;
  deleteRow: (dbId: string, rowPageId: string) => void;
  reorderRows: (dbId: string, orderedIds: string[]) => void;
  setRowValue: (dbId: string, rowPageId: string, propId: string, value: PropertyValue) => void;
  setRelationTwoWay: (dbId: string, propId: string, on: boolean, name?: string) => string | undefined;
  addView: (dbId: string, view: Omit<DatabaseViewConfig, "id">) => DatabaseViewConfig;
  updateView: (dbId: string, viewId: string, patch: Partial<DatabaseViewConfig>) => void;
  deleteView: (dbId: string, viewId: string) => void;
  restoreSnapshot: (snapshotId: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  signOut: () => void;
}

export const Ctx = createContext<StoreCtx | null>(null);

export function useStore() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useStore must be used inside StoreProvider");
  return c;
}
