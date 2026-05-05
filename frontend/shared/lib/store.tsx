import {
  createContext, useContext, useEffect, useMemo, useState, type ReactNode,
  useCallback,
} from "react";
import { useMutation, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../../convex/_generated/api";
import type {
  Block, BlockType, Page, Workspace, UserProfile, Preferences, Database,
  DatabaseViewConfig, Property, PropertyType, PropertyValue, PageSnapshot, SelectOption,
} from "@/shared/types/domain";
import { seedUser } from "@/shared/lib/seed";
import { useHistoryStack } from "./store/history";
import { useSnapshots } from "./store/snapshots";
import { usePageActions } from "./store/pageActions";
import { useDatabaseActions } from "./store/databaseActions";

function toPage(doc: any): Page {
  return {
    id: doc._id, parentId: doc.parentId, title: doc.title, icon: doc.icon, cover: doc.cover,
    blocks: doc.blocks ?? [], favorite: doc.favorite, trashed: doc.trashed, isPublic: doc.isPublic,
    rowOfDatabaseId: doc.rowOfDatabaseId, rowProps: doc.rowProps,
    font: doc.font, smallText: doc.smallText, fullWidth: doc.fullWidth, locked: doc.locked,
    createdAt: doc.createdAt, updatedAt: doc.updatedAt,
  };
}

function toDatabase(doc: any): Database {
  return {
    id: doc._id, name: doc.name, icon: doc.icon,
    properties: doc.properties ?? [], rowIds: doc.rowIds ?? [],
    views: doc.views ?? [], activeViewId: doc.activeViewId,
    createdAt: doc.createdAt, updatedAt: doc.updatedAt,
    uniqueIdCounter: doc.uniqueIdCounter,
    templates: doc.templates,
    defaultTemplateId: doc.defaultTemplateId ?? null,
    subItemsParentPropId: doc.subItemsParentPropId ?? null,
    trashed: !!doc.trashed,
  };
}

interface StoreCtx {
  user: UserProfile;
  updateUser: (patch: Partial<UserProfile>) => void;
  preferences: Preferences;
  updatePreferences: (patch: Partial<Preferences>) => void;
  workspace: Workspace;
  updateWorkspace: (patch: Partial<Workspace>) => void;
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
  /** True while initial pages/databases queries haven't resolved. Use for
   *  skeleton placeholders in sidebar/dashboard. */
  isInitialLoading: boolean;
  databases: Database[];
  trashedDatabases: Database[];
  getDatabase: (id: string) => Database | undefined;
  createDatabase: (name?: string) => Promise<Database>;
  updateDatabase: (id: string, patch: Partial<Database>) => void;
  trashDatabase: (id: string) => void;
  restoreDatabase: (id: string) => void;
  permanentlyDeleteDatabase: (id: string) => void;
  addDatabaseFromTable: (input: { headerRow: string[]; bodyRows: string[][] }) => Promise<string | null>;
  addProperty: (dbId: string, type: PropertyType, name?: string) => Property;
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
  addView: (dbId: string, view: Omit<DatabaseViewConfig, "id">) => DatabaseViewConfig;
  updateView: (dbId: string, viewId: string, patch: Partial<DatabaseViewConfig>) => void;
  deleteView: (dbId: string, viewId: string) => void;
  snapshots: PageSnapshot[];
  snapshotsForPage: (pageId: string) => PageSnapshot[];
  restoreSnapshot: (snapshotId: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  signOut: () => void;
}

const Ctx = createContext<StoreCtx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const { signOut: authSignOut } = useAuthActions();

  // Convex queries
  const rawPagesQ = useQuery(api.pages.list);
  const rawDatabasesQ = useQuery(api.databases.list);
  const rawPages = rawPagesQ ?? [];
  const rawDatabases = rawDatabasesQ ?? [];
  const rawPrefs = useQuery(api.preferences.get);
  const rawWorkspace = useQuery(api.workspaces.get);
  const rawRecents = useQuery(api.recents.get) ?? [];
  const isInitialLoading = rawPagesQ === undefined || rawDatabasesQ === undefined;

  // Cross-cutting mutations (kept here because used in user/workspace updates)
  const mutUpsertWorkspace = useMutation(api.workspaces.upsert);
  const mutUpsertPrefs = useMutation(api.preferences.upsert);

  // Derived collections
  const pages: Page[] = useMemo(() => rawPages.map(toPage), [rawPages]);
  const allDatabases: Database[] = useMemo(() => rawDatabases.map(toDatabase), [rawDatabases]);
  const databases: Database[] = useMemo(() => allDatabases.filter((d) => !d.trashed), [allDatabases]);
  const trashedDatabases: Database[] = useMemo(() => allDatabases.filter((d) => d.trashed), [allDatabases]);
  const recents: string[] = rawRecents;
  const pageMap = useMemo(() => new Map(pages.map((p) => [p.id, p])), [pages]);
  const databaseMap = useMemo(() => new Map(allDatabases.map((d) => [d.id, d])), [allDatabases]);

  const preferences: Preferences = useMemo(() => ({
    theme: (rawPrefs?.theme as any) ?? "system",
    sidebarDensity: (rawPrefs?.sidebarDensity as any) ?? "comfortable",
    defaultPageSort: (rawPrefs?.defaultPageSort as any) ?? "manual",
    editorBehavior: (rawPrefs?.editorBehavior as any) ?? "default",
    landingView: (rawPrefs?.landingView as any) ?? "dashboard",
    lastOpenedPageId: rawPrefs?.lastOpenedPageId ?? null,
  }), [rawPrefs]);

  const workspace: Workspace = useMemo(() => ({
    id: rawWorkspace?._id ?? "local",
    name: rawWorkspace?.name ?? "My Workspace",
    emoji: rawWorkspace?.emoji ?? "🏠",
  }), [rawWorkspace]);

  const me = useQuery(api.users.getMe);
  const [user, setUser] = useState<UserProfile>(seedUser);
  // Hydrate from real authed user; fall back to email local-part for name.
  useEffect(() => {
    if (!me) return;
    setUser((prev) => ({
      ...prev,
      id: String(me._id),
      name: me.displayName,
      email: me.email ?? prev.email,
    }));
  }, [me]);

  // Theme
  useEffect(() => {
    const apply = () => {
      const wantDark =
        preferences.theme === "dark" ||
        (preferences.theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
      document.documentElement.classList.toggle("dark", wantDark);
    };
    apply();
    if (preferences.theme === "system") {
      const m = window.matchMedia("(prefers-color-scheme: dark)");
      m.addEventListener("change", apply);
      return () => m.removeEventListener("change", apply);
    }
  }, [preferences.theme]);

  const history = useHistoryStack();
  const snapshotsApi = useSnapshots(user.name);

  const pageActions = usePageActions({
    pages, pageMap, preferences,
    snapshotIfNeeded: snapshotsApi.snapshotIfNeeded,
    pushStructuralAction: history.pushStructuralAction,
  });

  const databaseActions = useDatabaseActions({
    databaseMap,
    pushStructuralAction: history.pushStructuralAction,
  });

  // User/preferences/workspace
  const updateUser = useCallback((patch: Partial<UserProfile>) => {
    setUser((u) => ({ ...u, ...patch }));
  }, []);

  const updatePreferences = useCallback(
    (patch: Partial<Preferences>) => { mutUpsertPrefs({ patch }); },
    [mutUpsertPrefs],
  );

  const updateWorkspace = useCallback(
    (patch: Partial<Workspace>) => {
      const next = { ...workspace, ...patch };
      mutUpsertWorkspace({ name: next.name, emoji: next.emoji });
    },
    [workspace, mutUpsertWorkspace],
  );

  const signOut = useCallback(() => { authSignOut(); }, [authSignOut]);

  const value: StoreCtx = useMemo(
    () => ({
      user, updateUser,
      preferences, updatePreferences,
      workspace, updateWorkspace,
      pages, recents,
      ...pageActions,
      saving: false,
      isInitialLoading,
      databases, trashedDatabases,
      ...databaseActions,
      snapshots: snapshotsApi.snapshots,
      snapshotsForPage: snapshotsApi.snapshotsForPage,
      restoreSnapshot: snapshotsApi.restoreSnapshot,
      undo: history.undo,
      redo: history.redo,
      canUndo: history.canUndo,
      canRedo: history.canRedo,
      signOut,
    }),
    [
      user, updateUser, preferences, updatePreferences, workspace, updateWorkspace,
      pages, recents, pageActions, isInitialLoading,
      databases, trashedDatabases, databaseActions,
      snapshotsApi, history, signOut,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useStore must be used inside StoreProvider");
  return c;
}
