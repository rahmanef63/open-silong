import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useStore } from "@/shared/lib/store";
import { Page } from "@/shared/types/domain";
import { BlockEditor } from "./BlockEditor";
import { RowPropertiesPanel } from "./RowPropertiesPanel";
import { PageActionsMenu } from "./PageActionsMenu";
import { PageCommentsPanel, PageCommentsProvider } from "@/slices/comments";
import { BacklinksPanel } from "@/slices/backlinks";
import {
  ChevronRight, Star, ImagePlus, Share2, History, FileText, Plus,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import {
  DndContext, closestCenter, pointerWithin, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent, type CollisionDetection,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { ShareDialog } from "@/slices/sharing/components/ShareDialog";
import { VersionHistory } from "@/slices/snapshots/components/VersionHistory";
import { Button } from "@/shared/ui/button";
import { findLocation, moveBlock, type Location } from "./lib/blockTree";
import { prioritizeCollisions } from "./lib/collisionPriority";
import { BlockSelectionProvider, SelectionToolbar, SelectionKeyboard, MarqueeOverlay } from "@/slices/block-selection";
import {
  placeTopLevelGroupAtBlock, appendTopLevelGroupToContainer, topLevelIdsInOrder,
} from "@/slices/block-selection/lib/multiMove";

const ICONS = ["📄", "📝", "📚", "🚀", "🌱", "🛰️", "🎨", "🧠", "🪄", "🌙", "☕", "🔥", "🌊", "✨", "🪐", "🛠️"];
const COVERS = [
  "linear-gradient(135deg, hsl(24 90% 70%), hsl(340 80% 70%))",
  "linear-gradient(135deg, hsl(200 80% 70%), hsl(260 70% 70%))",
  "linear-gradient(135deg, hsl(140 50% 70%), hsl(180 60% 70%))",
  "linear-gradient(135deg, hsl(40 90% 75%), hsl(20 80% 65%))",
  "linear-gradient(135deg, hsl(260 70% 70%), hsl(320 70% 75%))",
];

export function PageEditor() {
  const { id } = useParams<{ id: string }>();
  const { getPage, updatePage, pushRecent, addBlock, reorderBlocks, childrenOf, createPage, getDatabase, updateDatabase } = useStore();
  void createPage;
  const navigate = useNavigate();
  const page = id ? getPage(id) : undefined;
  const [iconPick, setIconPick] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const refs = useRef<Map<string, HTMLElement | null>>(new Map());
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const blocksRef = useRef(page?.blocks);
  blocksRef.current = page?.blocks;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => { if (id && page) pushRecent(id); }, [id]);

  if (!page || page.trashed) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">🕊️</div>
          <h2 className="text-xl font-semibold mb-2">Page not found</h2>
          <p className="text-muted-foreground text-sm mb-6">This page may have been moved or deleted.</p>
          <button onClick={() => navigate("/")} className="rounded-md bg-foreground text-background px-4 py-2 text-sm hover:opacity-90">Back home</button>
        </div>
      </div>
    );
  }

  const registerRef = useCallback((id: string, el: HTMLElement | null) => {
    refs.current.set(id, el);
  }, []);
  const focusByOffset = useCallback((blockId: string, delta: number) => {
    const blocks = blocksRef.current;
    if (!blocks) return;
    const idx = blocks.findIndex((b) => b.id === blockId);
    if (idx === -1) return;
    const target = blocks[idx + delta];
    if (!target) return;
    refs.current.get(target.id)?.focus();
  }, []);

  // Collision detection priority:
  //  1. Leaf blocks under the pointer (precise drop on a child / sibling).
  //  2. Container droppables (col:* / toggle:*) when hovering empty space inside.
  //  3. closestCenter as last resort.
  // The container's OWN sortable id (e.g. "T" for a toggle block) is suppressed when its
  // inner droppable ("toggle:T" / "col:T:i") is present — otherwise dropping inside the
  // container would be misread as a top-level reorder of the container itself.
  const collisionDetection: CollisionDetection = (args) => {
    const prioritized = prioritizeCollisions(pointerWithin(args));
    return prioritized.length ? prioritized : closestCenter(args);
  };

  /** Read the active selection straight from the DOM — avoids restructuring
   * PageEditor to live inside BlockSelectionProvider's hook scope. */
  const getSelectedTopLevelIds = (): string[] => {
    const els = document.querySelectorAll<HTMLElement>(
      "[data-block-shell-id][data-block-selected]",
    );
    const all: string[] = [];
    els.forEach((el) => {
      const id = el.dataset.blockShellId;
      if (id) all.push(id);
    });
    // Filter to ids that are actually top-level on this page.
    return topLevelIdsInOrder(blocksRef.current ?? [], all);
  };

  const onDragEnd = (e: DragEndEvent) => {
    void reorderBlocks; // kept available; tree-aware move below uses updatePage directly
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    // ----- Multi-drag: active is a top-level block AND part of the active selection -----
    const selIds = getSelectedTopLevelIds();
    const isMulti = selIds.length > 1 && selIds.includes(activeId);

    if (isMulti) {
      const colMatch = overId.match(/^col:(.+):(\d+)$/);
      if (colMatch) {
        const [, containerId, colIndexStr] = colMatch;
        const colIndex = Number(colIndexStr);
        const next = appendTopLevelGroupToContainer(page.blocks, selIds, containerId, "column", colIndex);
        if (next !== page.blocks) updatePage(page.id, { blocks: next });
        return;
      }
      const toggleMatch = overId.match(/^toggle:(.+)$/);
      if (toggleMatch) {
        const containerId = toggleMatch[1];
        const next = appendTopLevelGroupToContainer(page.blocks, selIds, containerId, "toggle");
        if (next !== page.blocks) updatePage(page.id, { blocks: next });
        return;
      }
      // Drop on a sibling top-level block
      if (page.blocks.some((b) => b.id === overId)) {
        const next = placeTopLevelGroupAtBlock(page.blocks, selIds, overId);
        if (next !== page.blocks) updatePage(page.id, { blocks: next });
        return;
      }
      // Unrecognized over — fall through to single-block path
    }

    const from = findLocation(page.blocks, activeId);
    if (!from) return;

    // Drop on a container droppable (col:* / toggle:*) → append at end of container
    const colMatch = overId.match(/^col:(.+):(\d+)$/);
    if (colMatch) {
      const [, containerId, colIndexStr] = colMatch;
      if (containerId === activeId) return;
      const colIndex = Number(colIndexStr);
      const container = page.blocks.find((b) => b.id === containerId);
      const colLen = container?.columns?.[colIndex]?.length ?? 0;
      const to: Location = { kind: "col", containerId, colIndex, index: colLen };
      updatePage(page.id, { blocks: moveBlock(page.blocks, from, to) });
      return;
    }
    const toggleMatch = overId.match(/^toggle:(.+)$/);
    if (toggleMatch) {
      const containerId = toggleMatch[1];
      if (containerId === activeId) return;
      const container = page.blocks.find((b) => b.id === containerId);
      const childLen = container?.children?.length ?? 0;
      const to: Location = { kind: "toggle", containerId, index: childLen };
      updatePage(page.id, { blocks: moveBlock(page.blocks, from, to) });
      return;
    }

    // Drop on another block → insert at that block's location
    const overLoc = findLocation(page.blocks, overId);
    if (!overLoc) return;
    updatePage(page.id, { blocks: moveBlock(page.blocks, from, overLoc) });
  };

  const subpages = childrenOf(page.id);
  const onlyBlock = page.blocks.length === 1 ? page.blocks[0] : null;
  const fullPageDb = onlyBlock?.type === "database" && onlyBlock.databaseId
    ? getDatabase(onlyBlock.databaseId) ?? null
    : null;

  return (
    <PageCommentsProvider pageId={page.id}>
    <BlockSelectionProvider blockOrder={page.blocks.map((b) => b.id)}>
    <div className="flex h-full flex-col overflow-hidden">
      <Header page={page} onShare={() => setShareOpen(true)} onHistory={() => setHistoryOpen(o => !o)} historyOpen={historyOpen} />

      <div className="flex flex-1 min-h-0">
        <div ref={scrollRef} className="relative flex-1 overflow-y-auto scrollbar-thin">
          {page.cover && <div className="h-44 md:h-56 w-full" style={{ background: page.cover }} />}

          <div
            className={cn(
              "mx-auto px-6 md:px-12",
              fullPageDb || page.fullWidth ? "max-w-none" : "max-w-3xl",
              page.cover ? "-mt-10" : "pt-16",
              page.font === "serif" && "font-serif",
              page.font === "mono" && "font-mono",
              page.smallText && "text-[14px]",
            )}
          >
            <div className="relative">
              <button
                onClick={() => setIconPick(v => !v)}
                className="text-6xl leading-none hover:bg-accent rounded-md p-1 transition"
                aria-label="Change icon"
              >
                {page.icon}
              </button>
              {iconPick && (
                <div className="absolute z-20 mt-2 grid grid-cols-8 gap-1 rounded-lg border border-border bg-popover p-2 shadow-pop">
                  {ICONS.map(i => (
                    <button key={i} onClick={() => { updatePage(page.id, { icon: i }); setIconPick(false); }} className="text-xl rounded hover:bg-accent p-1.5">{i}</button>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              {!page.cover && (
                <button onClick={() => updatePage(page.id, { cover: COVERS[Math.floor(Math.random() * COVERS.length)] })} className="flex items-center gap-1 hover:text-foreground transition">
                  <ImagePlus className="h-3.5 w-3.5" /> Add cover
                </button>
              )}
            </div>

            <input
              value={fullPageDb ? fullPageDb.name : page.title}
              readOnly={page.locked}
              onChange={e => {
                if (fullPageDb) {
                  updateDatabase(fullPageDb.id, { name: e.target.value });
                  updatePage(page.id, { title: e.target.value });
                } else {
                  updatePage(page.id, { title: e.target.value });
                }
              }}
              placeholder={fullPageDb ? "Untitled database" : "Untitled"}
              className={cn(
                "mt-3 w-full bg-transparent text-4xl md:text-5xl font-bold tracking-tight outline-none placeholder:text-muted-foreground/40",
                page.font === "mono" ? "font-mono" : "font-serif",
              )}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === "ArrowDown") {
                  e.preventDefault();
                  refs.current.get(page.blocks[0]?.id ?? "")?.focus();
                }
              }}
            />

            {page.locked && (
              <div className="mt-3 flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-700 dark:text-amber-400">
                <span>🔒</span>
                <span className="flex-1">Page is locked. Editing is disabled.</span>
                <button
                  onClick={() => updatePage(page.id, { locked: false })}
                  className="rounded px-2 py-0.5 hover:bg-amber-500/20"
                >
                  Unlock
                </button>
              </div>
            )}

            {page.rowOfDatabaseId && <RowPropertiesPanel page={page} />}

            <div
              {...(page.locked ? { inert: "" as unknown as boolean } : {})}
              className={cn("mt-6 pb-32 prose-editor", page.locked && "opacity-90 select-text")}
            >
              <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragEnd={onDragEnd}>
                <SortableContext items={page.blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                  {page.blocks.map((b, i) => (
                    <BlockEditor
                      key={b.id}
                      pageId={page.id}
                      block={b}
                      index={i}
                      total={page.blocks.length}
                      registerRef={registerRef}
                      focusByOffset={focusByOffset}
                    />
                  ))}
                </SortableContext>
              </DndContext>

              {!fullPageDb && (
                <>
                  <button
                    onClick={async () => {
                      const newId = await addBlock(page.id, page.blocks.length - 1);
                      setTimeout(() => document.querySelector<HTMLElement>(`[data-block-id="${newId}"]`)?.focus(), 0);
                    }}
                    className="mt-2 text-sm text-muted-foreground hover:text-foreground transition"
                  >
                    + Add block
                  </button>

                  {/* Subpages section */}
                  <Subpages page={page} subpages={subpages} />

                  {/* Backlinks */}
                  <BacklinksPanel pageId={page.id} />

                  {/* Page-level comments */}
                  <PageCommentsPanel pageId={page.id} />
                </>
              )}
            </div>
          </div>
        </div>

        {historyOpen && (
          <div className="hidden lg:block w-80 border-l border-border bg-surface overflow-y-auto scrollbar-thin shrink-0">
            <VersionHistory pageId={page.id} onClose={() => setHistoryOpen(false)} />
          </div>
        )}
      </div>

      <ShareDialog open={shareOpen} onOpenChange={setShareOpen} page={page} />
      <MarqueeOverlay containerRef={scrollRef} />
      <SelectionToolbar pageId={page.id} />
      <SelectionKeyboard pageId={page.id} />
    </div>
    </BlockSelectionProvider>
    </PageCommentsProvider>
  );
}

function Subpages({ page, subpages }: { page: Page; subpages: Page[] }) {
  const navigate = useNavigate();
  const { createPage } = useStore();
  return (
    <section className="mt-12 border-t border-border pt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Pages inside</h3>
        <Button variant="ghost" size="sm" className="h-7 text-xs"
          onClick={async () => { const c = await createPage(page.id); navigate(`/p/${c.id}`); }}
        >
          <Plus className="h-3 w-3 mr-1" /> Add subpage
        </Button>
      </div>
      {subpages.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No pages inside yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {subpages.map(sp => (
            <button
              key={sp.id}
              onClick={() => navigate(`/p/${sp.id}`)}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("application/x-page-id", sp.id);
                e.dataTransfer.effectAllowed = "move";
              }}
              title="Drag to sidebar to re-parent"
              className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-left hover:border-border-strong transition cursor-grab active:cursor-grabbing"
            >
              <span>{sp.icon}</span>
              <span className="flex-1 truncate text-sm">{sp.title || "Untitled"}</span>
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function Header({ page, onShare, onHistory, historyOpen }: { page: Page; onShare: () => void; onHistory: () => void; historyOpen: boolean }) {
  const { getPage, toggleFavorite, saving, pages } = useStore();
  const navigate = useNavigate();
  const crumbs: Page[] = [];
  let cur: Page | undefined = page;
  while (cur) {
    crumbs.unshift(cur);
    cur = cur.parentId ? getPage(cur.parentId) : undefined;
  }

  // For database row pages, find the page that hosts the database block and prepend it as a breadcrumb
  const dbHostPage =
    page.rowOfDatabaseId
      ? pages.find(
          (p) =>
            !p.trashed &&
            p.blocks.some(
              (b) => b.type === "database" && b.databaseId === page.rowOfDatabaseId
            )
        )
      : undefined;

  // Prepend dbHostPage if it's not already in the crumbs trail
  const finalCrumbs =
    dbHostPage && !crumbs.some((c) => c.id === dbHostPage.id)
      ? [dbHostPage, ...crumbs]
      : crumbs;

  return (
    <header className="flex items-center justify-between gap-3 border-b border-border bg-background/80 backdrop-blur px-4 md:px-6 h-12 shrink-0">
      <nav className="flex items-center gap-1 text-sm min-w-0 overflow-hidden">
        {finalCrumbs.map((c, i) => (
          <div key={c.id} className="flex items-center gap-1 min-w-0">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
            <button
              onClick={() => navigate(`/p/${c.id}`)}
              className={cn(
                "flex items-center gap-1.5 rounded px-1.5 py-1 hover:bg-accent min-w-0",
                i === finalCrumbs.length - 1 ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <span>{c.icon}</span>
              <span className="truncate max-w-[160px]">{c.title || "Untitled"}</span>
            </button>
          </div>
        ))}
      </nav>
      <div className="flex items-center gap-1 shrink-0">
        <span className={cn("text-xs text-muted-foreground mr-2", saving && "animate-pulse-soft")}>
          {saving ? "Saving…" : "Saved"}
        </span>
        <button onClick={onShare} className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs hover:bg-accent">
          <Share2 className="h-3.5 w-3.5" /> Share
        </button>
        <button
          onClick={onHistory}
          className={cn("flex h-8 w-8 items-center justify-center rounded hover:bg-accent text-muted-foreground", historyOpen && "bg-accent text-foreground")}
          aria-label="Version history"
        >
          <History className="h-4 w-4" />
        </button>
        <button
          onClick={() => toggleFavorite(page.id)}
          className="flex h-8 w-8 items-center justify-center rounded hover:bg-accent text-muted-foreground"
          aria-label="Favorite"
        >
          <Star className={cn("h-4 w-4", page.favorite && "fill-brand text-brand")} />
        </button>
        <PageActionsMenu page={page} onShowHistory={onHistory} />
      </div>
    </header>
  );
}
