import { useCallback, useMemo, useRef, useState, useEffect, type ComponentType } from "react";
import { useParams } from "@/shared/lib/router";
import { useEditorAdapter } from "@/slices/editor/lib/useEditorAdapter";
import type { Block } from "@/shared/types/domain";
import { EditorComponentsProvider, type EditorComponentsRegistry } from "./lib/componentsRegistry";
import { BlockEditor } from "./BlockEditor";
import { RowPropertiesPanel } from "./RowPropertiesPanel";
import { PageCommentsPanel, PageCommentsProvider } from "@/slices/comments";
import { BacklinksPanel } from "@/slices/backlinks";
import { cn } from "@/shared/lib/utils";
import {
  DndContext, closestCenter, pointerWithin, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type CollisionDetection,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { ShareDialog } from "@/slices/sharing";
import { VersionHistory } from "@/slices/snapshots";
import { prioritizeCollisions } from "./lib/collisionPriority";
import { BlockSelectionProvider, SelectionToolbar, SelectionKeyboard, MarqueeOverlay } from "@/slices/block-selection";
import { PageHeaderSlot } from "@/shared/components/PageHeaderSlot";
import { useFullPage } from "./hooks/useFullPage";
import { usePageHashScroll } from "./hooks/usePageHashScroll";
import { useReadReceipt } from "./hooks/useReadReceipt";
import { useInlineAiShortcut } from "./hooks/useInlineAiShortcut";
import { useBlockMoveShortcut } from "./hooks/useBlockMoveShortcut";
import { useLegacyHostRedirect, legacyHostDbIdOf } from "./hooks/useLegacyHostRedirect";
import { handlePageDragEnd } from "./lib/pageDragEnd";
import { adaptPageLayouts, groupBlocksIntoChunks, hasLegacyColumns } from "./lib/layoutAdapter";
import { ColumnLayoutGroup } from "./components/ColumnLayoutGroup";
import { PageEditorSkeleton } from "./page-editor/PageEditorSkeleton";
import { PageNotFound } from "./page-editor/PageNotFound";
import { Button } from "@/shared/ui/button";
import { HeaderBreadcrumbs } from "./page-editor/HeaderBreadcrumbs";
import { HeaderActions } from "./page-editor/HeaderActions";
import { Subpages } from "./page-editor/Subpages";
import { PageTitle } from "./page-editor/PageTitle";
import { CoverBanner } from "@/slices/cover";
import type { CoverData } from "@/shared/types/domain";

/** Optional render-prop slots — consumers can override bundled
 *  peer-slice components. Today: DatabaseBlock from `@/slices/databases`
 *  is the default; provide a different one to e.g. render a stub when
 *  the databases slice is excluded from your bundle. Phase 4 of the
 *  lift plan moves the default to NotionAppProvider mount-time so the
 *  editor slice no longer imports databases directly. */
export interface PageEditorComponents {
  DatabaseBlock?: ComponentType<{ pageId: string; block: Block }>;
}

export interface PageEditorProps {
  components?: PageEditorComponents;
}

export function PageEditor({ components }: PageEditorProps = {}) {
  // Optional per-call override. The mounted NotionAppProvider supplies
  // the bundled default; only the `components` prop adds an additional
  // override for this instance. If neither is present (e.g. consumer
  // mounted PageEditor without NotionAppProvider), `DatabaseBlock`
  // falls through as `undefined` and BlockEditor renders a stub.
  const componentsValue = useMemo<EditorComponentsRegistry>(
    () => (components?.DatabaseBlock ? { DatabaseBlock: components.DatabaseBlock } : {}),
    [components?.DatabaseBlock],
  );
  const { id } = useParams<{ id: string }>();
  const { updatePage, pushRecent, addBlock, reorderBlocks, childrenOf, getDatabase } = useEditorAdapter();
  void reorderBlocks; // tree-aware move below uses updatePage directly
  const fullPageRaw = useFullPage(id ?? null);
  // Virtualize legacy `columns2..5` blocks into the new layout-primitive
  // shape on every read. Writes through the store persist the flattened
  // form, so each page migrates on first edit.
  const fullPage = fullPageRaw ? adaptPageLayouts(fullPageRaw) : fullPageRaw;
  const page = fullPage ?? undefined;
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

  useEffect(() => { if (id && page) pushRecent(id); }, [id, page?.id]);

  // Eager-migrate legacy `columns2..5` blocks on first read. The on-read
  // adapter only virtualizes the shape for rendering — the convex
  // updateBlock(blockId) mutation scans top-level `page.blocks`, so a
  // nested DB block's id is unreachable until we flatten + persist.
  // Without this, view-switch / color / patch writes silently no-op
  // inside columns. One-shot guard prevents update loops.
  const migratedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!fullPageRaw) return;
    if (!hasLegacyColumns(fullPageRaw)) return;
    if (migratedRef.current.has(fullPageRaw.id)) return;
    migratedRef.current.add(fullPageRaw.id);
    const adapted = adaptPageLayouts(fullPageRaw);
    updatePage(fullPageRaw.id, { blocks: adapted.blocks, layouts: adapted.layouts });
  }, [fullPageRaw?.id, updatePage]);

  usePageHashScroll(id);
  useReadReceipt(id);
  useInlineAiShortcut();
  useBlockMoveShortcut({ pageId: id, blocksRef, updatePage });

  const registerRef = useCallback((bid: string, el: HTMLElement | null) => {
    refs.current.set(bid, el);
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

  const legacyHostDbId = legacyHostDbIdOf(page);
  useLegacyHostRedirect(legacyHostDbId, page?.id, getDatabase);

  if (fullPage === undefined) return <PageEditorSkeleton />;
  if (!page || page.trashed) return <PageNotFound />;

  const chunks = groupBlocksIntoChunks(page.blocks, page.layouts);

  // 1-based ordinals for consecutive numbered blocks at the same indent.
  // Reset deeper counters on every non-numbered or shallower-indent block.
  const ordinals = new Map<string, number>();
  {
    const counters: number[] = [];
    for (const b of page.blocks) {
      const depth = b.indent ?? 0;
      if (b.type === "numbered") {
        counters[depth] = (counters[depth] ?? 0) + 1;
        counters.length = depth + 1;
        ordinals.set(b.id, counters[depth]);
      } else {
        counters.length = depth;
      }
    }
  }

  const renderOneBlock = (b: typeof page.blocks[number], i: number) => (
    <BlockEditor
      key={b.id}
      pageId={page.id}
      block={b}
      index={i}
      total={page.blocks.length}
      registerRef={registerRef}
      focusByOffset={focusByOffset}
      ordinal={ordinals.get(b.id)}
    />
  );

  const addToColumn = async (layoutId: string, col: number) => {
    const blocks = blocksRef.current ?? [];
    let insertAfter = -1;
    for (let i = 0; i < blocks.length; i++) {
      if (blocks[i].layoutGroup === layoutId) insertAfter = i;
    }
    if (insertAfter === -1) insertAfter = blocks.length - 1;
    const newId = await addBlock(page.id, insertAfter, "paragraph", { layoutGroup: layoutId, layoutCol: col });
    setTimeout(() => document.querySelector<HTMLElement>(`[data-block-id="${newId}"]`)?.focus(), 0);
  };

  const commitLayoutWidths = (layoutId: string, next: number[]) => {
    const layouts = (page.layouts ?? []).map((l) => l.id === layoutId ? { ...l, widths: next } : l);
    updatePage(page.id, { layouts });
  };

  const collisionDetection: CollisionDetection = (args) => {
    const prioritized = prioritizeCollisions(pointerWithin(args));
    return prioritized.length ? prioritized : closestCenter(args);
  };

  const subpages = childrenOf(page.id);
  const fullPageDb = legacyHostDbId ? getDatabase(legacyHostDbId) : null;
  if (fullPageDb && !fullPageDb.trashed) return null;

  return (
    <EditorComponentsProvider value={componentsValue}>
    <PageCommentsProvider pageId={page.id}>
    <BlockSelectionProvider blockOrder={page.blocks.map((b) => b.id)}>
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeaderSlot
        left={<HeaderBreadcrumbs page={page} />}
        right={
          <HeaderActions
            page={page}
            onShare={() => setShareOpen(true)}
            onHistory={() => setHistoryOpen((o) => !o)}
            historyOpen={historyOpen}
          />
        }
      />

      <div className="flex flex-1 min-h-0">
        <div ref={scrollRef} className="relative flex-1 overflow-y-auto scrollbar-thin">
          {page.cover && (
            <div className="relative">
              <CoverBanner
                cover={page.cover}
                onChange={(next: CoverData | null) => updatePage(page.id, { cover: next })}
              />
            </div>
          )}

          <div
            className={cn(
              "mx-auto px-4 sm:px-6 md:px-12",
              fullPageDb || page.fullWidth ? "max-w-none" : "max-w-3xl",
              // relative + z-10 lifts content above the cover banner —
              // cover wrapper has position:relative so it paints at
              // step 6 of CSS stacking; without this lift the title/
              // icon (normal-flow step 3) gets buried under the banner
              // when the -mt-10 overlap kicks in.
              page.cover ? "relative z-10 -mt-10" : "pt-16",
              page.font === "serif" && "font-serif",
              page.font === "mono" && "font-mono",
              page.smallText && "text-[14px]",
            )}
          >
            <PageTitle page={page} fullPageDb={fullPageDb} firstBlockRef={refs} />

            {page.rowOfDatabaseId && <RowPropertiesPanel page={page} />}

            <div
              {...(page.locked ? { inert: "" as unknown as boolean } : {})}
              className={cn("mt-6 pb-32 prose-editor", page.locked && "opacity-90 select-text")}
            >
              <DndContext
                sensors={sensors}
                collisionDetection={collisionDetection}
                onDragEnd={(e) => handlePageDragEnd(e, { page, updatePage })}
              >
                <SortableContext items={page.blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                  {chunks.map((chunk) => {
                    if (chunk.kind === "block") return renderOneBlock(chunk.block, chunk.index);
                    return (
                      <ColumnLayoutGroup
                        key={`layout-${chunk.layout.id}`}
                        layout={chunk.layout}
                        columns={chunk.columns}
                        pageId={page.id}
                        page={page}
                        renderBlock={renderOneBlock}
                        onAddBlockInColumn={(c) => addToColumn(chunk.layout.id, c)}
                        onCommitWidths={(next) => commitLayoutWidths(chunk.layout.id, next)}
                      />
                    );
                  })}
                </SortableContext>
              </DndContext>

              {!fullPageDb && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      const newId = await addBlock(page.id, page.blocks.length - 1);
                      setTimeout(() => document.querySelector<HTMLElement>(`[data-block-id="${newId}"]`)?.focus(), 0);
                    }}
                    className="mt-2 h-auto px-0 py-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
                  >
                    + Add block
                  </Button>

                  <Subpages page={page} subpages={subpages} />
                  <BacklinksPanel pageId={page.id} />
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
    </EditorComponentsProvider>
  );
}
