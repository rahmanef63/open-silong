"use client";

import { useCallback, useRef, type ReactNode } from "react";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { Plus, X } from "lucide-react";
import { useStore } from "@/shared/lib/store";
import { BlockEditor, RowPropertiesPanel, useFullPage } from "@/slices/editor";
import { PageCommentsProvider } from "@/slices/comments";
import { DynamicIcon, IconPickerPopover, DEFAULT_ROW_ICON } from "@/shared/components/icon-picker";
import { Button } from "@/shared/ui/button";
import type { Block } from "@/shared/types/domain";

interface Props {
  pageId: string;
  /** Header strip (above title) — typically the mode switcher. */
  headerExtras?: ReactNode;
  /** Called when user clicks the explicit close button in the header. */
  onClose?: () => void;
}

/**
 * Shared row-detail body — title + icon + properties (preview + accordion)
 * + block editor. Used by RowDetailSheet, RowDetailDialog, and rendered
 * inline by PageEditor for full-page row pages.
 *
 * Renders nothing while the page query is loading.
 */
export function RowDetailBody({ pageId, headerExtras, onClose }: Props) {
  const { updatePage, addBlock, reorderBlocks } = useStore();
  const fullPage = useFullPage(pageId);
  const page = fullPage ?? undefined;
  const refs = useRef<Map<string, HTMLElement | null>>(new Map());
  const blocksRef = useRef<Block[] | undefined>(page?.blocks);
  blocksRef.current = page?.blocks;

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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (!page) return null;

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = page.blocks.map((b) => b.id);
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from === -1 || to === -1) return;
    const next = [...ids];
    next.splice(to, 0, next.splice(from, 1)[0]);
    reorderBlocks(page.id, next);
  };

  return (
    <PageCommentsProvider pageId={page.id}>
      {(headerExtras !== undefined || onClose) && (
        <header className="flex items-center justify-between gap-3 border-b border-border px-3 py-2 shrink-0">
          <span className="text-xs text-muted-foreground shrink-0">Row peek</span>
          <div className="flex items-center gap-2 shrink-0">
            {headerExtras}
            {onClose && (
              <Button
                variant="ghost"
                type="button"
                variant="ghost"
                size="icon"
                onClick={onClose}
                aria-label="Close"
                className="h-6 w-6 rounded p-0 text-muted-foreground transition-colors hover:text-foreground [&_svg]:size-3.5"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </header>
      )}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-6 md:px-10 py-8">
        <div className="flex items-start gap-2">
          <IconPickerPopover
            value={page.icon}
            onChange={(next) => updatePage(page.id, { icon: next })}
            onClear={() => updatePage(page.id, { icon: DEFAULT_ROW_ICON })}
          >
            <Button
              variant="ghost"
              type="button"
              className="h-auto rounded-md p-1 text-4xl font-normal leading-none"
              aria-label="Change icon"
            >
              <DynamicIcon value={page.icon} />
            </Button>
          </IconPickerPopover>
        </div>
        <input
          value={page.title}
          onChange={(e) => updatePage(page.id, { title: e.target.value })}
          placeholder="Untitled"
          className="mt-2 w-full bg-transparent text-3xl font-bold tracking-tight outline-none placeholder:text-muted-foreground/40"
        />
        <div className="mt-5">
          <RowPropertiesPanel page={page} />
        </div>
        <div className="mt-2 prose-editor">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
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
          <Button
            variant="ghost"
            onClick={async () => {
              const newId = await addBlock(page.id, page.blocks.length - 1);
              setTimeout(
                () => document.querySelector<HTMLElement>(`[data-block-id="${newId}"]`)?.focus(),
                0,
              );
            }}
            className="mt-2 h-auto gap-1 p-0 text-xs font-normal text-muted-foreground hover:bg-transparent hover:text-foreground [&_svg]:size-3"
          >
            <Plus className="h-3 w-3" /> Add block
          </Button>
        </div>
      </div>
    </PageCommentsProvider>
  );
}
