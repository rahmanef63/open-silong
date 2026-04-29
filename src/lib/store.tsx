import { createContext, useContext, useEffect, useMemo, useState, ReactNode, useCallback } from "react";
import { Block, BlockType, Page, Workspace } from "./types";
import { seedPages, seedWorkspace } from "./seed";

const STORAGE_KEY = "notiony.v1";

interface Persisted {
  workspace: Workspace;
  pages: Page[];
  recents: string[];
}

interface StoreCtx {
  workspace: Workspace;
  pages: Page[];
  recents: string[];
  getPage: (id: string) => Page | undefined;
  childrenOf: (parentId: string | null) => Page[];
  createPage: (parentId?: string | null) => Page;
  updatePage: (id: string, patch: Partial<Page>) => void;
  deletePage: (id: string) => void;
  restorePage: (id: string) => void;
  permanentlyDelete: (id: string) => void;
  duplicatePage: (id: string) => Page | undefined;
  toggleFavorite: (id: string) => void;
  addBlock: (pageId: string, afterIndex: number, type?: BlockType) => string;
  updateBlock: (pageId: string, blockId: string, patch: Partial<Block>) => void;
  deleteBlock: (pageId: string, blockId: string) => void;
  moveBlock: (pageId: string, fromIndex: number, toIndex: number) => void;
  setBlockType: (pageId: string, blockId: string, type: BlockType) => void;
  pushRecent: (id: string) => void;
  trash: Page[];
  search: (q: string) => Page[];
  saving: boolean;
}

const Ctx = createContext<StoreCtx | null>(null);

const uid = () => Math.random().toString(36).slice(2, 10);

function load(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { workspace: seedWorkspace, pages: seedPages(), recents: [] };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const initial = useMemo(load, []);
  const [workspace] = useState<Workspace>(initial.workspace);
  const [pages, setPages] = useState<Page[]>(initial.pages);
  const [recents, setRecents] = useState<string[]>(initial.recents);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSaving(true);
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ workspace, pages, recents }));
      } catch {}
      setSaving(false);
    }, 350);
    return () => clearTimeout(t);
  }, [workspace, pages, recents]);

  const getPage = useCallback((id: string) => pages.find(p => p.id === id), [pages]);

  const childrenOf = useCallback(
    (parentId: string | null) => pages.filter(p => !p.trashed && p.parentId === parentId).sort((a, b) => a.createdAt - b.createdAt),
    [pages]
  );

  const createPage = useCallback((parentId: string | null = null): Page => {
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
    };
    setPages(prev => [...prev, page]);
    return page;
  }, []);

  const updatePage = useCallback((id: string, patch: Partial<Page>) => {
    setPages(prev => prev.map(p => (p.id === id ? { ...p, ...patch, updatedAt: Date.now() } : p)));
  }, []);

  const collectDescendants = (id: string, all: Page[]): string[] => {
    const out = [id];
    const kids = all.filter(p => p.parentId === id);
    for (const k of kids) out.push(...collectDescendants(k.id, all));
    return out;
  };

  const deletePage = useCallback((id: string) => {
    setPages(prev => {
      const ids = collectDescendants(id, prev);
      return prev.map(p => (ids.includes(p.id) ? { ...p, trashed: true, updatedAt: Date.now() } : p));
    });
  }, []);

  const restorePage = useCallback((id: string) => {
    setPages(prev => {
      const ids = collectDescendants(id, prev);
      return prev.map(p => (ids.includes(p.id) ? { ...p, trashed: false } : p));
    });
  }, []);

  const permanentlyDelete = useCallback((id: string) => {
    setPages(prev => {
      const ids = collectDescendants(id, prev);
      return prev.filter(p => !ids.includes(p.id));
    });
  }, []);

  const duplicatePage = useCallback((id: string): Page | undefined => {
    const src = pages.find(p => p.id === id);
    if (!src) return;
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
  }, [pages]);

  const toggleFavorite = useCallback((id: string) => {
    setPages(prev => prev.map(p => (p.id === id ? { ...p, favorite: !p.favorite } : p)));
  }, []);

  const addBlock = useCallback((pageId: string, afterIndex: number, type: BlockType = "paragraph") => {
    const newId = uid();
    setPages(prev => prev.map(p => {
      if (p.id !== pageId) return p;
      const blocks = [...p.blocks];
      blocks.splice(afterIndex + 1, 0, { id: newId, type, text: "", checked: type === "todo" ? false : undefined });
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

  const moveBlock = useCallback((pageId: string, fromIndex: number, toIndex: number) => {
    setPages(prev => prev.map(p => {
      if (p.id !== pageId) return p;
      const blocks = [...p.blocks];
      const [moved] = blocks.splice(fromIndex, 1);
      blocks.splice(toIndex, 0, moved);
      return { ...p, blocks, updatedAt: Date.now() };
    }));
  }, []);

  const setBlockType = useCallback((pageId: string, blockId: string, type: BlockType) => {
    setPages(prev => prev.map(p => {
      if (p.id !== pageId) return p;
      return { ...p, blocks: p.blocks.map(b => (b.id === blockId ? { ...b, type, checked: type === "todo" ? (b.checked ?? false) : undefined } : b)), updatedAt: Date.now() };
    }));
  }, []);

  const pushRecent = useCallback((id: string) => {
    setRecents(prev => [id, ...prev.filter(x => x !== id)].slice(0, 6));
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

  const value: StoreCtx = {
    workspace, pages, recents, getPage, childrenOf, createPage, updatePage, deletePage,
    restorePage, permanentlyDelete, duplicatePage, toggleFavorite, addBlock, updateBlock,
    deleteBlock, moveBlock, setBlockType, pushRecent, trash, search, saving,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useStore must be used inside StoreProvider");
  return c;
}
