import { createContext, useContext, useEffect, useMemo, useState, ReactNode, useCallback, useRef } from "react";
import {
  Block, BlockType, Page, Workspace, UserProfile, Preferences, Database,
  DatabaseViewConfig, Property, PropertyType, PropertyValue, PageSnapshot, SelectOption,
} from "./types";
import { seedPages, seedWorkspace, seedUser, seedPreferences, seedDatabases } from "./seed";

const STORAGE_KEY = "notiony.v2";

interface Persisted {
  workspace: Workspace;
  pages: Page[];
  recents: string[];
  user: UserProfile;
  preferences: Preferences;
  databases: Database[];
  snapshots: PageSnapshot[];
}

interface StoreCtx {
  // identity / prefs
  user: UserProfile;
  updateUser: (patch: Partial<UserProfile>) => void;
  preferences: Preferences;
  updatePreferences: (patch: Partial<Preferences>) => void;

  // workspace
  workspace: Workspace;
  updateWorkspace: (patch: Partial<Workspace>) => void;

  // pages
  pages: Page[];
  recents: string[];
  getPage: (id: string) => Page | undefined;
  childrenOf: (parentId: string | null) => Page[];
  createPage: (parentId?: string | null, opts?: Partial<Page>) => Page;
  updatePage: (id: string, patch: Partial<Page>) => void;
  movePage: (id: string, newParentId: string | null) => void;
  reorderRootPages: (orderedIds: string[]) => void;
  deletePage: (id: string) => void;
  restorePage: (id: string) => void;
  permanentlyDelete: (id: string) => void;
  duplicatePage: (id: string) => Page | undefined;
  toggleFavorite: (id: string) => void;
  togglePublic: (id: string) => void;

  // blocks
  addBlock: (pageId: string, afterIndex: number, type?: BlockType, init?: Partial<Block>) => string;
  updateBlock: (pageId: string, blockId: string, patch: Partial<Block>) => void;
  deleteBlock: (pageId: string, blockId: string) => void;
  duplicateBlock: (pageId: string, blockId: string) => string | undefined;
  moveBlock: (pageId: string, fromIndex: number, toIndex: number) => void;
  reorderBlocks: (pageId: string, orderedIds: string[]) => void;
  setBlockType: (pageId: string, blockId: string, type: BlockType) => void;

  // misc
  pushRecent: (id: string) => void;
  trash: Page[];
  search: (q: string) => Page[];
  saving: boolean;

  // databases
  databases: Database[];
  getDatabase: (id: string) => Database | undefined;
  createDatabase: (name?: string) => Database;
  updateDatabase: (id: string, patch: Partial<Database>) => void;
  addProperty: (dbId: string, type: PropertyType, name?: string) => Property;
  updateProperty: (dbId: string, propId: string, patch: Partial<Property>) => void;
  deleteProperty: (dbId: string, propId: string) => void;
  reorderProperties: (dbId: string, orderedIds: string[]) => void;
  addSelectOption: (dbId: string, propId: string, name: string, color?: string) => SelectOption;
  addRow: (dbId: string, init?: Partial<Page>) => Page;
  deleteRow: (dbId: string, rowPageId: string) => void;
  reorderRows: (dbId: string, orderedIds: string[]) => void;
  setRowValue: (dbId: string, rowPageId: string, propId: string, value: PropertyValue) => void;
  // views
  addView: (dbId: string, view: Omit<DatabaseViewConfig, "id">) => DatabaseViewConfig;
  updateView: (dbId: string, viewId: string, patch: Partial<DatabaseViewConfig>) => void;
  deleteView: (dbId: string, viewId: string) => void;

  // version history
  snapshots: PageSnapshot[];
  snapshotsForPage: (pageId: string) => PageSnapshot[];
  restoreSnapshot: (snapshotId: string) => void;

  // global undo/redo for structural changes (DnD, etc.)
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const Ctx = createContext<StoreCtx | null>(null);

const uid = () => Math.random().toString(36).slice(2, 10);

function load(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Persisted;
      // ensure new fields exist
      return {
        workspace: p.workspace ?? seedWorkspace,
        pages: p.pages ?? seedPages(),
        recents: p.recents ?? [],
        user: p.user ?? seedUser,
        preferences: { ...seedPreferences, ...(p.preferences ?? {}) },
        databases: p.databases ?? seedDatabases(),
        snapshots: p.snapshots ?? [],
      };
    }
  } catch {}
  return {
    workspace: seedWorkspace,
    pages: seedPages(),
    recents: [],
    user: seedUser,
    preferences: seedPreferences,
    databases: seedDatabases(),
    snapshots: [],
  };
}

const SELECT_COLORS = ["gray", "brown", "orange", "yellow", "green", "blue", "purple", "pink", "red"];
const pickColor = (i: number) => SELECT_COLORS[i % SELECT_COLORS.length];

export function StoreProvider({ children }: { children: ReactNode }) {
  const initial = useMemo(load, []);
  const [workspace, setWorkspace] = useState<Workspace>(initial.workspace);
  const [pages, setPages] = useState<Page[]>(initial.pages);
  const [recents, setRecents] = useState<string[]>(initial.recents);
  const [user, setUser] = useState<UserProfile>(initial.user);
  const [preferences, setPreferences] = useState<Preferences>(initial.preferences);
  const [databases, setDatabases] = useState<Database[]>(initial.databases);
  const [snapshots, setSnapshots] = useState<PageSnapshot[]>(initial.snapshots);
  const [saving, setSaving] = useState(false);

  // ===== Theme application =====
  useEffect(() => {
    const apply = () => {
      const wantDark = preferences.theme === "dark"
        || (preferences.theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
      document.documentElement.classList.toggle("dark", wantDark);
    };
    apply();
    if (preferences.theme === "system") {
      const m = window.matchMedia("(prefers-color-scheme: dark)");
      m.addEventListener("change", apply);
      return () => m.removeEventListener("change", apply);
    }
  }, [preferences.theme]);

  // ===== Persist (debounced) + auto snapshot =====
  const lastSnapshotRef = useRef<Record<string, number>>({});
  useEffect(() => {
    setSaving(true);
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          workspace, pages, recents, user, preferences, databases, snapshots,
        }));
      } catch {}
      setSaving(false);
    }, 350);
    return () => clearTimeout(t);
  }, [workspace, pages, recents, user, preferences, databases, snapshots]);

  // ===== Undo / redo (structural ops) =====
  const undoStack = useRef<Persisted[]>([]);
  const redoStack = useRef<Persisted[]>([]);
  const pushHistory = useCallback(() => {
    undoStack.current.push({ workspace, pages, recents, user, preferences, databases, snapshots });
    if (undoStack.current.length > 50) undoStack.current.shift();
    redoStack.current = [];
  }, [workspace, pages, recents, user, preferences, databases, snapshots]);

  const undo = useCallback(() => {
    const prev = undoStack.current.pop();
    if (!prev) return;
    redoStack.current.push({ workspace, pages, recents, user, preferences, databases, snapshots });
    setWorkspace(prev.workspace);
    setPages(prev.pages);
    setRecents(prev.recents);
    setUser(prev.user);
    setPreferences(prev.preferences);
    setDatabases(prev.databases);
    setSnapshots(prev.snapshots);
  }, [workspace, pages, recents, user, preferences, databases, snapshots]);

  const redo = useCallback(() => {
    const next = redoStack.current.pop();
    if (!next) return;
    undoStack.current.push({ workspace, pages, recents, user, preferences, databases, snapshots });
    setWorkspace(next.workspace);
    setPages(next.pages);
    setRecents(next.recents);
    setUser(next.user);
    setPreferences(next.preferences);
    setDatabases(next.databases);
    setSnapshots(next.snapshots);
  }, [workspace, pages, recents, user, preferences, databases, snapshots]);

  const updateUser = useCallback((patch: Partial<UserProfile>) => {
    setUser(u => ({ ...u, ...patch }));
  }, []);
  const updatePreferences = useCallback((patch: Partial<Preferences>) => {
    setPreferences(p => ({ ...p, ...patch }));
  }, []);
  const updateWorkspace = useCallback((patch: Partial<Workspace>) => {
    setWorkspace(w => ({ ...w, ...patch }));
  }, []);

  const getPage = useCallback((id: string) => pages.find(p => p.id === id), [pages]);

  const childrenOf = useCallback(
    (parentId: string | null) =>
      pages.filter(p => !p.trashed && !p.rowOfDatabaseId && p.parentId === parentId)
        .sort((a, b) => {
          switch (preferences.defaultPageSort) {
            case "title": return a.title.localeCompare(b.title);
            case "updated": return b.updatedAt - a.updatedAt;
            case "created": return a.createdAt - b.createdAt;
            default: return a.createdAt - b.createdAt;
          }
        }),
    [pages, preferences.defaultPageSort]
  );

  const createPage = useCallback((parentId: string | null = null, opts: Partial<Page> = {}): Page => {
    pushHistory();
    const now = Date.now();
    const page: Page = {
      id: uid(),
      parentId,
      title: "",
      icon: "📄",
      cover: null,
      blocks: [{ id: uid(), type: "paragraph", text: "" }],
      favorite: false,
      trashed: false,
      createdAt: now,
      updatedAt: now,
      ...opts,
    };
    setPages(prev => [...prev, page]);
    return page;
  }, [pushHistory]);

  const snapshotIfNeeded = useCallback((pageId: string, page: Page) => {
    const last = lastSnapshotRef.current[pageId] ?? 0;
    const now = Date.now();
    // throttle: at most one per 90s
    if (now - last < 90_000) return;
    lastSnapshotRef.current[pageId] = now;
    setSnapshots(prev => {
      const snap: PageSnapshot = {
        id: uid(),
        pageId,
        authorId: user.id,
        authorName: user.name,
        takenAt: now,
        title: page.title,
        icon: page.icon,
        cover: page.cover ?? null,
        blocks: JSON.parse(JSON.stringify(page.blocks)),
        rowProps: page.rowProps ? JSON.parse(JSON.stringify(page.rowProps)) : undefined,
      };
      const next = [snap, ...prev];
      // cap at 200 total
      return next.slice(0, 500);
    });
  }, [user.id, user.name]);

  const updatePage = useCallback((id: string, patch: Partial<Page>) => {
    setPages(prev => prev.map(p => {
      if (p.id !== id) return p;
      const next = { ...p, ...patch, updatedAt: Date.now() };
      snapshotIfNeeded(id, p); // snapshot the BEFORE state
      return next;
    }));
  }, [snapshotIfNeeded]);

  const collectDescendants = (id: string, all: Page[]): string[] => {
    const out = [id];
    const kids = all.filter(p => p.parentId === id);
    for (const k of kids) out.push(...collectDescendants(k.id, all));
    return out;
  };

  const deletePage = useCallback((id: string) => {
    pushHistory();
    setPages(prev => {
      const ids = collectDescendants(id, prev);
      return prev.map(p => (ids.includes(p.id) ? { ...p, trashed: true, updatedAt: Date.now() } : p));
    });
  }, [pushHistory]);

  const restorePage = useCallback((id: string) => {
    pushHistory();
    setPages(prev => {
      const ids = collectDescendants(id, prev);
      return prev.map(p => (ids.includes(p.id) ? { ...p, trashed: false } : p));
    });
  }, [pushHistory]);

  const permanentlyDelete = useCallback((id: string) => {
    pushHistory();
    setPages(prev => {
      const ids = collectDescendants(id, prev);
      return prev.filter(p => !ids.includes(p.id));
    });
    setSnapshots(prev => prev.filter(s => s.pageId !== id));
  }, [pushHistory]);

  const duplicatePage = useCallback((id: string): Page | undefined => {
    const src = pages.find(p => p.id === id);
    if (!src) return;
    pushHistory();
    const copy: Page = {
      ...src,
      id: uid(),
      title: src.title ? `${src.title} (copy)` : "",
      blocks: src.blocks.map(b => ({ ...b, id: uid() })),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      favorite: false,
    };
    setPages(prev => [...prev, copy]);
    return copy;
  }, [pages, pushHistory]);

  const toggleFavorite = useCallback((id: string) => {
    setPages(prev => prev.map(p => (p.id === id ? { ...p, favorite: !p.favorite } : p)));
  }, []);

  const togglePublic = useCallback((id: string) => {
    setPages(prev => prev.map(p => (p.id === id ? { ...p, isPublic: !p.isPublic } : p)));
  }, []);

  const movePage = useCallback((id: string, newParentId: string | null) => {
    pushHistory();
    setPages(prev => {
      // Prevent moving into own descendant
      const desc = collectDescendants(id, prev);
      if (newParentId && desc.includes(newParentId)) return prev;
      return prev.map(p => p.id === id ? { ...p, parentId: newParentId, updatedAt: Date.now() } : p);
    });
  }, [pushHistory]);

  const reorderRootPages = useCallback((orderedIds: string[]) => {
    pushHistory();
    setPages(prev => {
      // restamp createdAt to enforce order with default 'manual' sort using createdAt fallback
      const base = Date.now();
      const map: Record<string, number> = {};
      orderedIds.forEach((id, i) => { map[id] = base + i; });
      return prev.map(p => map[p.id] !== undefined ? { ...p, createdAt: map[p.id] } : p);
    });
  }, [pushHistory]);

  const addBlock = useCallback((pageId: string, afterIndex: number, type: BlockType = "paragraph", init: Partial<Block> = {}) => {
    const newId = uid();
    setPages(prev => prev.map(p => {
      if (p.id !== pageId) return p;
      const blocks = [...p.blocks];
      blocks.splice(afterIndex + 1, 0, {
        id: newId,
        type,
        text: "",
        checked: type === "todo" ? false : undefined,
        ...init,
      });
      return { ...p, blocks, updatedAt: Date.now() };
    }));
    return newId;
  }, []);

  const updateBlock = useCallback((pageId: string, blockId: string, patch: Partial<Block>) => {
    setPages(prev => prev.map(p => {
      if (p.id !== pageId) return p;
      return { ...p, blocks: p.blocks.map(b => (b.id === blockId ? { ...b, ...patch } : b)), updatedAt: Date.now() };
    }));
  }, []);

  const deleteBlock = useCallback((pageId: string, blockId: string) => {
    setPages(prev => prev.map(p => {
      if (p.id !== pageId) return p;
      const blocks = p.blocks.filter(b => b.id !== blockId);
      return { ...p, blocks: blocks.length ? blocks : [{ id: uid(), type: "paragraph", text: "" }], updatedAt: Date.now() };
    }));
  }, []);

  const duplicateBlock = useCallback((pageId: string, blockId: string): string | undefined => {
    let newId: string | undefined;
    setPages(prev => prev.map(p => {
      if (p.id !== pageId) return p;
      const idx = p.blocks.findIndex(b => b.id === blockId);
      if (idx === -1) return p;
      newId = uid();
      const dup: Block = { ...p.blocks[idx], id: newId };
      const blocks = [...p.blocks];
      blocks.splice(idx + 1, 0, dup);
      return { ...p, blocks, updatedAt: Date.now() };
    }));
    return newId;
  }, []);

  const moveBlock = useCallback((pageId: string, fromIndex: number, toIndex: number) => {
    pushHistory();
    setPages(prev => prev.map(p => {
      if (p.id !== pageId) return p;
      const blocks = [...p.blocks];
      const [moved] = blocks.splice(fromIndex, 1);
      blocks.splice(toIndex, 0, moved);
      return { ...p, blocks, updatedAt: Date.now() };
    }));
  }, [pushHistory]);

  const reorderBlocks = useCallback((pageId: string, orderedIds: string[]) => {
    pushHistory();
    setPages(prev => prev.map(p => {
      if (p.id !== pageId) return p;
      const map = new Map(p.blocks.map(b => [b.id, b]));
      const blocks = orderedIds.map(id => map.get(id)!).filter(Boolean);
      return { ...p, blocks, updatedAt: Date.now() };
    }));
  }, [pushHistory]);

  const setBlockType = useCallback((pageId: string, blockId: string, type: BlockType) => {
    setPages(prev => prev.map(p => {
      if (p.id !== pageId) return p;
      return { ...p, blocks: p.blocks.map(b => (b.id === blockId ? { ...b, type, checked: type === "todo" ? (b.checked ?? false) : undefined } : b)), updatedAt: Date.now() };
    }));
  }, []);

  const pushRecent = useCallback((id: string) => {
    setRecents(prev => [id, ...prev.filter(x => x !== id)].slice(0, 8));
    setPreferences(p => ({ ...p, lastOpenedPageId: id }));
  }, []);

  const trash = useMemo(() => pages.filter(p => p.trashed), [pages]);

  const search = useCallback((q: string) => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return pages.filter(p => !p.trashed && (
      p.title.toLowerCase().includes(s) ||
      p.blocks.some(b => b.text.toLowerCase().includes(s))
    )).slice(0, 20);
  }, [pages]);

  // ===== Databases =====
  const getDatabase = useCallback((id: string) => databases.find(d => d.id === id), [databases]);

  const createDatabase = useCallback((name = "Untitled database"): Database => {
    pushHistory();
    const titleProp: Property = { id: uid(), name: "Name", type: "text" };
    const statusProp: Property = {
      id: uid(), name: "Status", type: "status",
      options: [
        { id: uid(), name: "Not started", color: "gray" },
        { id: uid(), name: "In progress", color: "blue" },
        { id: uid(), name: "Done", color: "green" },
      ],
    };
    const view: DatabaseViewConfig = {
      id: uid(), name: "Table", type: "table", sorts: [], filters: [], search: "",
    };
    const db: Database = {
      id: uid(), name, icon: "🗂️",
      properties: [titleProp, statusProp],
      rowIds: [],
      views: [view],
      activeViewId: view.id,
      createdAt: Date.now(), updatedAt: Date.now(),
    };
    setDatabases(prev => [...prev, db]);
    return db;
  }, [pushHistory]);

  const updateDatabase = useCallback((id: string, patch: Partial<Database>) => {
    setDatabases(prev => prev.map(d => d.id === id ? { ...d, ...patch, updatedAt: Date.now() } : d));
  }, []);

  const addProperty = useCallback((dbId: string, type: PropertyType, name?: string): Property => {
    const prop: Property = {
      id: uid(),
      name: name ?? defaultPropName(type),
      type,
      options: (type === "select" || type === "multi_select" || type === "status") ? [] : undefined,
    };
    setDatabases(prev => prev.map(d => d.id === dbId ? { ...d, properties: [...d.properties, prop], updatedAt: Date.now() } : d));
    return prop;
  }, []);

  const updateProperty = useCallback((dbId: string, propId: string, patch: Partial<Property>) => {
    setDatabases(prev => prev.map(d => d.id === dbId ? {
      ...d, properties: d.properties.map(p => p.id === propId ? { ...p, ...patch } : p), updatedAt: Date.now(),
    } : d));
  }, []);

  const deleteProperty = useCallback((dbId: string, propId: string) => {
    pushHistory();
    setDatabases(prev => prev.map(d => d.id === dbId ? {
      ...d, properties: d.properties.filter(p => p.id !== propId), updatedAt: Date.now(),
    } : d));
  }, [pushHistory]);

  const reorderProperties = useCallback((dbId: string, orderedIds: string[]) => {
    pushHistory();
    setDatabases(prev => prev.map(d => {
      if (d.id !== dbId) return d;
      const map = new Map(d.properties.map(p => [p.id, p]));
      return { ...d, properties: orderedIds.map(id => map.get(id)!).filter(Boolean), updatedAt: Date.now() };
    }));
  }, [pushHistory]);

  const addSelectOption = useCallback((dbId: string, propId: string, name: string, color?: string): SelectOption => {
    const opt: SelectOption = { id: uid(), name, color: color ?? pickColor(Math.floor(Math.random() * 9)) };
    setDatabases(prev => prev.map(d => d.id === dbId ? {
      ...d, properties: d.properties.map(p => p.id === propId ? { ...p, options: [...(p.options ?? []), opt] } : p),
    } : d));
    return opt;
  }, []);

  const addRow = useCallback((dbId: string, init: Partial<Page> = {}): Page => {
    pushHistory();
    const now = Date.now();
    const row: Page = {
      id: uid(), parentId: null, title: "", icon: "📄",
      blocks: [{ id: uid(), type: "paragraph", text: "" }],
      favorite: false, trashed: false,
      createdAt: now, updatedAt: now,
      rowOfDatabaseId: dbId,
      rowProps: {},
      ...init,
    };
    setPages(prev => [...prev, row]);
    setDatabases(prev => prev.map(d => d.id === dbId ? { ...d, rowIds: [...d.rowIds, row.id], updatedAt: now } : d));
    return row;
  }, [pushHistory]);

  const deleteRow = useCallback((dbId: string, rowPageId: string) => {
    pushHistory();
    setPages(prev => prev.map(p => p.id === rowPageId ? { ...p, trashed: true, updatedAt: Date.now() } : p));
    setDatabases(prev => prev.map(d => d.id === dbId ? { ...d, rowIds: d.rowIds.filter(r => r !== rowPageId), updatedAt: Date.now() } : d));
  }, [pushHistory]);

  const reorderRows = useCallback((dbId: string, orderedIds: string[]) => {
    pushHistory();
    setDatabases(prev => prev.map(d => d.id === dbId ? { ...d, rowIds: orderedIds, updatedAt: Date.now() } : d));
  }, [pushHistory]);

  const setRowValue = useCallback((dbId: string, rowPageId: string, propId: string, value: PropertyValue) => {
    setPages(prev => prev.map(p => p.id === rowPageId ? {
      ...p, rowProps: { ...(p.rowProps ?? {}), [propId]: value }, updatedAt: Date.now(),
    } : p));
  }, []);

  const addView = useCallback((dbId: string, view: Omit<DatabaseViewConfig, "id">): DatabaseViewConfig => {
    const v: DatabaseViewConfig = { ...view, id: uid() };
    setDatabases(prev => prev.map(d => d.id === dbId ? { ...d, views: [...d.views, v], activeViewId: v.id } : d));
    return v;
  }, []);

  const updateView = useCallback((dbId: string, viewId: string, patch: Partial<DatabaseViewConfig>) => {
    setDatabases(prev => prev.map(d => d.id === dbId ? {
      ...d, views: d.views.map(v => v.id === viewId ? { ...v, ...patch } : v),
    } : d));
  }, []);

  const deleteView = useCallback((dbId: string, viewId: string) => {
    setDatabases(prev => prev.map(d => {
      if (d.id !== dbId) return d;
      const views = d.views.filter(v => v.id !== viewId);
      const activeViewId = d.activeViewId === viewId ? views[0]?.id ?? d.activeViewId : d.activeViewId;
      return { ...d, views: views.length ? views : d.views, activeViewId };
    }));
  }, []);

  // ===== Snapshots =====
  const snapshotsForPage = useCallback((pageId: string) =>
    snapshots.filter(s => s.pageId === pageId).sort((a, b) => b.takenAt - a.takenAt),
  [snapshots]);

  const restoreSnapshot = useCallback((snapshotId: string) => {
    const snap = snapshots.find(s => s.id === snapshotId);
    if (!snap) return;
    pushHistory();
    setPages(prev => prev.map(p => p.id === snap.pageId ? {
      ...p,
      title: snap.title,
      icon: snap.icon,
      cover: snap.cover ?? null,
      blocks: JSON.parse(JSON.stringify(snap.blocks)),
      rowProps: snap.rowProps ? JSON.parse(JSON.stringify(snap.rowProps)) : p.rowProps,
      updatedAt: Date.now(),
    } : p));
  }, [snapshots, pushHistory]);

  const value: StoreCtx = {
    user, updateUser, preferences, updatePreferences,
    workspace, updateWorkspace,
    pages, recents, getPage, childrenOf, createPage, updatePage, movePage, reorderRootPages,
    deletePage, restorePage, permanentlyDelete, duplicatePage, toggleFavorite, togglePublic,
    addBlock, updateBlock, deleteBlock, duplicateBlock, moveBlock, reorderBlocks, setBlockType,
    pushRecent, trash, search, saving,
    databases, getDatabase, createDatabase, updateDatabase,
    addProperty, updateProperty, deleteProperty, reorderProperties, addSelectOption,
    addRow, deleteRow, reorderRows, setRowValue,
    addView, updateView, deleteView,
    snapshots, snapshotsForPage, restoreSnapshot,
    undo, redo, canUndo: undoStack.current.length > 0, canRedo: redoStack.current.length > 0,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

function defaultPropName(type: PropertyType): string {
  const map: Record<PropertyType, string> = {
    text: "Text", number: "Number", select: "Select", multi_select: "Tags", status: "Status",
    date: "Date", person: "Person", checkbox: "Done", url: "URL", email: "Email", phone: "Phone",
    files: "Files", relation: "Relation", rollup: "Rollup", formula: "Formula",
    created_time: "Created", created_by: "Created by", last_edited_time: "Last edited",
    last_edited_by: "Last edited by",
  };
  return map[type];
}

export function useStore() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useStore must be used inside StoreProvider");
  return c;
}
