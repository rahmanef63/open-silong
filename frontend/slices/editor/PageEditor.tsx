import { useCallback, useRef, useState, useEffect } from "react";
import { useParams } from "@/shared/lib/router";
import { useStore } from "@/shared/lib/store";
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
import { PageEditorSkeleton } from "./page-editor/PageEditorSkeleton";
import { PageNotFound } from "./page-editor/PageNotFound";
import { Button } from "@/shared/ui/button";
import { HeaderBreadcrumbs } from "./page-editor/HeaderBreadcrumbs";
import { HeaderActions } from "./page-editor/HeaderActions";
import { Subpages } from "./page-editor/Subpages";
import { PageTitle } from "./page-editor/PageTitle";
import { CoverBanner } from "@/slices/cover";
import type { CoverData } from "@/shared/types/domain";

export function PageEditor() {
  const { id } = useParams<{ id: string }>();
  const { updatePage, pushRecent, addBlock, reorderBlocks, childrenOf, getDatabase } = useStore();
  void reorderBlocks; // tree-aware move below uses updatePage directly
  const fullPage = useFullPage(id ?? null);
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

  const collisionDetection: CollisionDetection = (args) => {
    const prioritized = prioritizeCollisions(pointerWithin(args));
    return prioritized.length ? prioritized : closestCenter(args);
  };

  const subpages = childrenOf(page.id);
  const fullPageDb = legacyHostDbId ? getDatabase(legacyHostDbId) : null;
  if (fullPageDb && !fullPageDb.trashed) return null;

  return (
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
  );
}
