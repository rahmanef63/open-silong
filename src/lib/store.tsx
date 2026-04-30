import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
  useCallback,
  useRef,
} from "react";
import { useQuery, useMutation } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";
import {
  Block,
  BlockType,
  Page,
  Workspace,
  UserProfile,
  Preferences,
  Database,
  DatabaseViewConfig,
  Property,
  PropertyType,
  PropertyValue,
  PageSnapshot,
  SelectOption,
} from "./types";
import { seedWorkspace, seedUser, seedPreferences } from "./seed";

const uid = () => Math.random().toString(36).slice(2, 10);
const SELECT_COLORS = ["gray", "brown", "orange", "yellow", "green", "blue", "purple", "pink", "red"];
const pickColor = (i: number) => SELECT_COLORS[i % SELECT_COLORS.length];

function toPage(doc: any): Page {
  return {
    id: doc._id,
    parentId: doc.parentId,
    title: doc.title,
    icon: doc.icon,
    cover: doc.cover,
    blocks: doc.blocks ?? [],
    favorite: doc.favorite,
    trashed: doc.trashed,
    isPublic: doc.isPublic,
    rowOfDatabaseId: doc.rowOfDatabaseId,
    rowProps: doc.rowProps,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function toDatabase(doc: any): Database {
  return {
    id: doc._id,
    name: doc.name,
    icon: doc.icon,
    properties: doc.properties ?? [],
    rowIds: doc.rowIds ?? [],
    views: doc.views ?? [],
    activeViewId: doc.activeViewId,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
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
  duplicateBlock: (pageId: string, blockId: string) => void;
  moveBlock: (pageId: string, fromIndex: number, toIndex: number) => void;
  reorderBlocks: (pageId: string, orderedIds: string[]) => void;
  setBlockType: (pageId: string, blockId: string, type: BlockType) => void;
  pushRecent: (id: string) => void;
  trash: Page[];
  search: (q: string) => Page[];
  saving: boolean;
  databases: Database[];
  getDatabase: (id: string) => Database | undefined;
  createDatabase: (name?: string) => Promise<Database>;
  updateDatabase: (id: string, patch: Partial<Database>) => void;
  addProperty: (dbId: string, type: PropertyType, name?: string) => Property;
  updateProperty: (dbId: string, propId: string, patch: Partial<Property>) => void;
  deleteProperty: (dbId: string, propId: string) => void;
  reorderProperties: (dbId: string, orderedIds: string[]) => void;
  addSelectOption: (dbId: string, propId: string, name: string, color?: string) => SelectOption;
  updateSelectOption: (dbId: string, propId: string, optId: string, patch: Partial<SelectOption>) => void;
  deleteSelectOption: (dbId: string, propId: string, optId: string) => void;
  addRow: (dbId: string, init?: Partial<Page>) => Promise<Page>;
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
  const rawPages = useQuery(api.pages.list) ?? [];
  const rawDatabases = useQuery(api.databases.list) ?? [];
  const rawPrefs = useQuery(api.preferences.get);
  const rawWorkspace = useQuery(api.workspaces.get);
  const rawRecents = useQuery(api.recents.get) ?? [];
  const rawSnapshots = useQuery(api.snapshots.listAll) ?? [];

  // Convex mutations
  const mutCreatePage = useMutation(api.pages.create);
  const mutUpdatePage = useMutation(api.pages.update);
  const mutTrashPage = useMutation(api.pages.trash);
  const mutRestorePage = useMutation(api.pages.restore);
  const mutPermanentlyDelete = useMutation(api.pages.permanentlyDelete);
  const mutDuplicatePage = useMutation(api.pages.duplicate);
  const mutAddBlock = useMutation(api.pages.addBlock);
  const mutUpdateBlock = useMutation(api.pages.updateBlock);
  const mutDeleteBlock = useMutation(api.pages.deleteBlock);
  const mutReorderBlocks = useMutation(api.pages.reorderBlocks);
  const mutCreateDatabase = useMutation(api.databases.create);
  const mutUpdateDatabase = useMutation(api.databases.update);
  const mutAddRow = useMutation(api.databases.addRow);
  const mutDeleteRow = useMutation(api.databases.deleteRow);
  const mutSetRowValue = useMutation(api.databases.setRowValue);
  const mutUpsertWorkspace = useMutation(api.workspaces.upsert);
  const mutUpsertPrefs = useMutation(api.preferences.upsert);
  const mutPushRecent = useMutation(api.recents.push);
  const mutCreateSnapshot = useMutation(api.snapshots.create);
  const mutRestoreSnapshot = useMutation(api.snapshots.restore);

  const pages: Page[] = rawPages.map(toPage);
  const databases: Database[] = rawDatabases.map(toDatabase);
  const recents: string[] = rawRecents;

  const preferences: Preferences = {
    theme: (rawPrefs?.theme as any) ?? "system",
    sidebarDensity: (rawPrefs?.sidebarDensity as any) ?? "comfortable",
    defaultPageSort: (rawPrefs?.defaultPageSort as any) ?? "manual",
    editorBehavior: (rawPrefs?.editorBehavior as any) ?? "default",
    landingView: (rawPrefs?.landingView as any) ?? "dashboard",
    lastOpenedPageId: rawPrefs?.lastOpenedPageId ?? null,
  };

  const workspace: Workspace = {
    id: rawWorkspace?._id ?? "local",
    name: rawWorkspace?.name ?? "My Workspace",
    emoji: rawWorkspace?.emoji ?? "🏠",
  };

  // User from seed until we wire profile to auth user
  const [user, setUser] = useState<UserProfile>(seedUser);

  // Theme effect
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

  // Snapshot throttle ref
  const lastSnapshotRef = useRef<Record<string, number>>({});

  const snapshotIfNeeded = useCallback(
    (pageId: string, page: Page) => {
      const last = lastSnapshotRef.current[pageId] ?? 0;
      const now = Date.now();
      if (now - last < 90_000) return;
      lastSnapshotRef.current[pageId] = now;
      mutCreateSnapshot({
        pageId,
        authorName: user.name,
        takenAt: now,
        title: page.title,
        icon: page.icon,
        cover: page.cover ?? null,
        blocks: JSON.parse(JSON.stringify(page.blocks)),
        rowProps: page.rowProps ? JSON.parse(JSON.stringify(page.rowProps)) : undefined,
      });
    },
    [user.name, mutCreateSnapshot]
  );

  // ===== Implementations =====

  const updateUser = useCallback((patch: Partial<UserProfile>) => {
    setUser((u) => ({ ...u, ...patch }));
  }, []);

  const updatePreferences = useCallback(
    (patch: Partial<Preferences>) => {
      mutUpsertPrefs({ patch });
    },
    [mutUpsertPrefs]
  );

  const updateWorkspace = useCallback(
    (patch: Partial<Workspace>) => {
      const next = { ...workspace, ...patch };
      mutUpsertWorkspace({ name: next.name, emoji: next.emoji });
    },
    [workspace, mutUpsertWorkspace]
  );

  const getPage = useCallback((id: string) => pages.find((p) => p.id === id), [pages]);

  const childrenOf = useCallback(
    (parentId: string | null) =>
      pages
        .filter((p) => !p.trashed && !p.rowOfDatabaseId && p.parentId === parentId)
        .sort((a, b) => {
          switch (preferences.defaultPageSort) {
            case "title":
              return a.title.localeCompare(b.title);
            case "updated":
              return b.updatedAt - a.updatedAt;
            case "created":
              return a.createdAt - b.createdAt;
            default:
              return a.createdAt - b.createdAt;
          }
        }),
    [pages, preferences.defaultPageSort]
  );

  const createPage = useCallback(
    async (parentId: string | null = null, opts: Partial<Page> = {}): Promise<Page> => {
      const id = await mutCreatePage({
        parentId,
        title: opts.title,
        icon: opts.icon,
        rowOfDatabaseId: opts.rowOfDatabaseId,
      });
      const now = Date.now();
      return {
        id,
        parentId,
        title: opts.title ?? "",
        icon: opts.icon ?? "📄",
        cover: null,
        blocks: [{ id: uid(), type: "paragraph", text: "" }],
        favorite: false,
        trashed: false,
        createdAt: now,
        updatedAt: now,
        ...opts,
      };
    },
    [mutCreatePage]
  );

  const updatePage = useCallback(
    (id: string, patch: Partial<Page>) => {
      const page = pages.find((p) => p.id === id);
      if (page) snapshotIfNeeded(id, page);
      mutUpdatePage({ pageId: id, patch });
    },
    [pages, mutUpdatePage, snapshotIfNeeded]
  );

  const movePage = useCallback(
    (id: string, newParentId: string | null) => {
      mutUpdatePage({ pageId: id, patch: { parentId: newParentId } });
    },
    [mutUpdatePage]
  );

  const reorderRootPages = useCallback(
    (orderedIds: string[]) => {
      const base = Date.now();
      orderedIds.forEach((id, i) => {
        mutUpdatePage({ pageId: id, patch: { createdAt: base + i } });
      });
    },
    [mutUpdatePage]
  );

  const deletePage = useCallback(
    (id: string) => {
      mutTrashPage({ pageId: id });
    },
    [mutTrashPage]
  );

  const restorePage = useCallback(
    (id: string) => {
      mutRestorePage({ pageId: id });
    },
    [mutRestorePage]
  );

  const permanentlyDelete = useCallback(
    (id: string) => {
      mutPermanentlyDelete({ pageId: id });
    },
    [mutPermanentlyDelete]
  );

  const duplicatePage = useCallback(
    async (id: string): Promise<Page | undefined> => {
      const newId = await mutDuplicatePage({ pageId: id });
      if (!newId) return undefined;
      const now = Date.now();
      return { id: newId, parentId: null, title: "", icon: "📄", cover: null, blocks: [], favorite: false, trashed: false, createdAt: now, updatedAt: now };
    },
    [mutDuplicatePage]
  );

  const toggleFavorite = useCallback(
    (id: string) => {
      const page = pages.find((p) => p.id === id);
      if (page) mutUpdatePage({ pageId: id, patch: { favorite: !page.favorite } });
    },
    [pages, mutUpdatePage]
  );

  const togglePublic = useCallback(
    (id: string) => {
      const page = pages.find((p) => p.id === id);
      if (page) mutUpdatePage({ pageId: id, patch: { isPublic: !page.isPublic } });
    },
    [pages, mutUpdatePage]
  );

  const addBlock = useCallback(
    async (pageId: string, afterIndex: number, type: BlockType = "paragraph", init: Partial<Block> = {}): Promise<string> => {
      return await mutAddBlock({ pageId, afterIndex, type, init });
    },
    [mutAddBlock]
  );

  const updateBlock = useCallback(
    (pageId: string, blockId: string, patch: Partial<Block>) => {
      mutUpdateBlock({ pageId, blockId, patch });
    },
    [mutUpdateBlock]
  );

  const deleteBlock = useCallback(
    (pageId: string, blockId: string) => {
      mutDeleteBlock({ pageId, blockId });
    },
    [mutDeleteBlock]
  );

  const duplicateBlock = useCallback(
    (pageId: string, blockId: string) => {
      const page = pages.find((p) => p.id === pageId);
      if (!page) return;
      const idx = page.blocks.findIndex((b) => b.id === blockId);
      if (idx === -1) return;
      const dup = { ...page.blocks[idx], id: uid() };
      const blocks = [...page.blocks];
      blocks.splice(idx + 1, 0, dup);
      mutUpdatePage({ pageId, patch: { blocks } });
    },
    [pages, mutUpdatePage]
  );

  const moveBlock = useCallback(
    (pageId: string, fromIndex: number, toIndex: number) => {
      const page = pages.find((p) => p.id === pageId);
      if (!page) return;
      const blocks = [...page.blocks];
      const [moved] = blocks.splice(fromIndex, 1);
      blocks.splice(toIndex, 0, moved);
      mutUpdatePage({ pageId, patch: { blocks } });
    },
    [pages, mutUpdatePage]
  );

  const reorderBlocks = useCallback(
    (pageId: string, orderedIds: string[]) => {
      mutReorderBlocks({ pageId, orderedIds });
    },
    [mutReorderBlocks]
  );

  const setBlockType = useCallback(
    (pageId: string, blockId: string, type: BlockType) => {
      mutUpdateBlock({
        pageId,
        blockId,
        patch: { type, checked: type === "todo" ? false : undefined },
      });
    },
    [mutUpdateBlock]
  );

  const pushRecent = useCallback(
    (id: string) => {
      mutPushRecent({ pageId: id });
      mutUpsertPrefs({ patch: { lastOpenedPageId: id } });
    },
    [mutPushRecent, mutUpsertPrefs]
  );

  const trash = useMemo(() => pages.filter((p) => p.trashed), [pages]);

  const search = useCallback(
    (q: string) => {
      const s = q.trim().toLowerCase();
      if (!s) return [];
      return pages
        .filter(
          (p) =>
            !p.trashed &&
            (p.title.toLowerCase().includes(s) || p.blocks.some((b) => b.text.toLowerCase().includes(s)))
        )
        .slice(0, 20);
    },
    [pages]
  );

  // ===== Databases =====

  const getDatabase = useCallback((id: string) => databases.find((d) => d.id === id), [databases]);

  const createDatabase = useCallback(
    async (name = "Untitled database"): Promise<Database> => {
      const id = await mutCreateDatabase({ name });
      const now = Date.now();
      return { id, name, icon: "🗂️", properties: [], rowIds: [], views: [], activeViewId: "", createdAt: now, updatedAt: now };
    },
    [mutCreateDatabase]
  );

  const updateDatabase = useCallback(
    (id: string, patch: Partial<Database>) => {
      mutUpdateDatabase({ dbId: id, patch });
    },
    [mutUpdateDatabase]
  );

  const addProperty = useCallback(
    (dbId: string, type: PropertyType, name?: string): Property => {
      const prop: Property = {
        id: uid(),
        name: name ?? defaultPropName(type),
        type,
        options: type === "select" || type === "multi_select" || type === "status" ? [] : undefined,
      };
      const db = databases.find((d) => d.id === dbId);
      if (db) {
        mutUpdateDatabase({ dbId, patch: { properties: [...db.properties, prop] } });
      }
      return prop;
    },
    [databases, mutUpdateDatabase]
  );

  const updateProperty = useCallback(
    (dbId: string, propId: string, patch: Partial<Property>) => {
      const db = databases.find((d) => d.id === dbId);
      if (!db) return;
      const properties = db.properties.map((p) => (p.id === propId ? { ...p, ...patch } : p));
      mutUpdateDatabase({ dbId, patch: { properties } });
    },
    [databases, mutUpdateDatabase]
  );

  const deleteProperty = useCallback(
    (dbId: string, propId: string) => {
      const db = databases.find((d) => d.id === dbId);
      if (!db) return;
      const properties = db.properties.filter((p) => p.id !== propId);
      mutUpdateDatabase({ dbId, patch: { properties } });
    },
    [databases, mutUpdateDatabase]
  );

  const reorderProperties = useCallback(
    (dbId: string, orderedIds: string[]) => {
      const db = databases.find((d) => d.id === dbId);
      if (!db) return;
      const map = new Map(db.properties.map((p) => [p.id, p]));
      const properties = orderedIds.map((id) => map.get(id)!).filter(Boolean);
      mutUpdateDatabase({ dbId, patch: { properties } });
    },
    [databases, mutUpdateDatabase]
  );

  const addSelectOption = useCallback(
    (dbId: string, propId: string, name: string, color?: string): SelectOption => {
      const opt: SelectOption = { id: uid(), name, color: color ?? pickColor(Math.floor(Math.random() * 9)) };
      const db = databases.find((d) => d.id === dbId);
      if (db) {
        const properties = db.properties.map((p) =>
          p.id === propId ? { ...p, options: [...(p.options ?? []), opt] } : p
        );
        mutUpdateDatabase({ dbId, patch: { properties } });
      }
      return opt;
    },
    [databases, mutUpdateDatabase]
  );

  const updateSelectOption = useCallback(
    (dbId: string, propId: string, optId: string, patch: Partial<SelectOption>) => {
      const db = databases.find((d) => d.id === dbId);
      if (!db) return;
      const properties = db.properties.map((p) =>
        p.id === propId
          ? { ...p, options: (p.options ?? []).map(o => o.id === optId ? { ...o, ...patch } : o) }
          : p
      );
      mutUpdateDatabase({ dbId, patch: { properties } });
    },
    [databases, mutUpdateDatabase]
  );

  const deleteSelectOption = useCallback(
    (dbId: string, propId: string, optId: string) => {
      const db = databases.find((d) => d.id === dbId);
      if (!db) return;
      const properties = db.properties.map((p) =>
        p.id === propId
          ? { ...p, options: (p.options ?? []).filter(o => o.id !== optId) }
          : p
      );
      mutUpdateDatabase({ dbId, patch: { properties } });
    },
    [databases, mutUpdateDatabase]
  );

  const addRow = useCallback(
    async (dbId: string, init: Partial<Page> = {}): Promise<Page> => {
      const rowId = await mutAddRow({ dbId, init });
      const now = Date.now();
      return { id: rowId, parentId: null, title: "", icon: "📄", cover: null, blocks: [], favorite: false, trashed: false, rowOfDatabaseId: dbId, rowProps: {}, createdAt: now, updatedAt: now };
    },
    [mutAddRow]
  );

  const deleteRow = useCallback(
    (dbId: string, rowPageId: string) => {
      mutDeleteRow({ dbId, rowPageId });
    },
    [mutDeleteRow]
  );

  const reorderRows = useCallback(
    (dbId: string, orderedIds: string[]) => {
      const db = databases.find((d) => d.id === dbId);
      if (!db) return;
      mutUpdateDatabase({ dbId, patch: { rowIds: orderedIds } });
    },
    [databases, mutUpdateDatabase]
  );

  const setRowValue = useCallback(
    (dbId: string, rowPageId: string, propId: string, value: PropertyValue) => {
      mutSetRowValue({ dbId, rowPageId, propId, value });
    },
    [mutSetRowValue]
  );

  const addView = useCallback(
    (dbId: string, view: Omit<DatabaseViewConfig, "id">): DatabaseViewConfig => {
      const v: DatabaseViewConfig = { ...view, id: uid() };
      const db = databases.find((d) => d.id === dbId);
      if (db) {
        mutUpdateDatabase({ dbId, patch: { views: [...db.views, v], activeViewId: v.id } });
      }
      return v;
    },
    [databases, mutUpdateDatabase]
  );

  const updateView = useCallback(
    (dbId: string, viewId: string, patch: Partial<DatabaseViewConfig>) => {
      const db = databases.find((d) => d.id === dbId);
      if (!db) return;
      const views = db.views.map((v) => (v.id === viewId ? { ...v, ...patch } : v));
      mutUpdateDatabase({ dbId, patch: { views } });
    },
    [databases, mutUpdateDatabase]
  );

  const deleteView = useCallback(
    (dbId: string, viewId: string) => {
      const db = databases.find((d) => d.id === dbId);
      if (!db) return;
      const views = db.views.filter((v) => v.id !== viewId);
      const activeViewId = db.activeViewId === viewId ? views[0]?.id ?? db.activeViewId : db.activeViewId;
      mutUpdateDatabase({ dbId, patch: { views: views.length ? views : db.views, activeViewId } });
    },
    [databases, mutUpdateDatabase]
  );

  // ===== Snapshots =====

  const snapshots: PageSnapshot[] = rawSnapshots.map((s: any) => ({
    id: s._id,
    pageId: s.pageId,
    authorId: s.authorId,
    authorName: s.authorName,
    takenAt: s.takenAt,
    title: s.title,
    icon: s.icon,
    cover: s.cover,
    blocks: s.blocks,
    rowProps: s.rowProps,
  }));

  const snapshotsForPage = useCallback(
    (pageId: string) => snapshots.filter((s) => s.pageId === pageId).sort((a, b) => b.takenAt - a.takenAt),
    [snapshots]
  );

  const restoreSnapshotFn = useCallback(
    (snapshotId: string) => {
      mutRestoreSnapshot({ snapshotId });
    },
    [mutRestoreSnapshot]
  );

  const signOut = useCallback(() => {
    authSignOut();
  }, [authSignOut]);

  const value: StoreCtx = {
    user,
    updateUser,
    preferences,
    updatePreferences,
    workspace,
    updateWorkspace,
    pages,
    recents,
    getPage,
    childrenOf,
    createPage,
    updatePage,
    movePage,
    reorderRootPages,
    deletePage,
    restorePage,
    permanentlyDelete,
    duplicatePage,
    toggleFavorite,
    togglePublic,
    addBlock,
    updateBlock,
    deleteBlock,
    duplicateBlock,
    moveBlock,
    reorderBlocks,
    setBlockType,
    pushRecent,
    trash,
    search,
    saving: false,
    databases,
    getDatabase,
    createDatabase,
    updateDatabase,
    addProperty,
    updateProperty,
    deleteProperty,
    reorderProperties,
    addSelectOption,
    updateSelectOption,
    deleteSelectOption,
    addRow,
    deleteRow,
    reorderRows,
    setRowValue,
    addView,
    updateView,
    deleteView,
    snapshots,
    snapshotsForPage,
    restoreSnapshot: restoreSnapshotFn,
    undo: () => {},
    redo: () => {},
    canUndo: false,
    canRedo: false,
    signOut,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

function defaultPropName(type: PropertyType): string {
  const map: Record<PropertyType, string> = {
    text: "Text",
    number: "Number",
    select: "Select",
    multi_select: "Tags",
    status: "Status",
    date: "Date",
    person: "Person",
    checkbox: "Done",
    url: "URL",
    email: "Email",
    phone: "Phone",
    files: "Files",
    relation: "Relation",
    rollup: "Rollup",
    formula: "Formula",
    created_time: "Created",
    created_by: "Created by",
    last_edited_time: "Last edited",
    last_edited_by: "Last edited by",
  };
  return map[type];
}

export function useStore() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useStore must be used inside StoreProvider");
  return c;
}
