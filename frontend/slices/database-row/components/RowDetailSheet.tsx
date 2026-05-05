import { useCallback, useRef } from "react";
import { useNavigate } from "@/shared/lib/router-compat";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { ExternalLink, Plus } from "lucide-react";
import {
  Sheet, SheetContent, SheetTitle, SheetDescription,
} from "@/shared/ui/sheet";
import { useStore } from "@/shared/lib/store";
import { BlockEditor } from "@/slices/editor/BlockEditor";
import { RowPropertiesPanel } from "@/slices/editor/RowPropertiesPanel";
import { PageCommentsProvider } from "@/slices/comments";
import { DynamicIcon, IconPickerPopover } from "@/slices/icon-picker";
import type { Block } from "@/shared/types/domain";

interface Props {
  pageId: string | null;
  onOpenChange: (open: boolean) => void;
}

export function RowDetailSheet({ pageId, onOpenChange }: Props) {
  const { getPage, updatePage, addBlock, reorderBlocks } = useStore();
  const navigate = useNavigate();
  const page = pageId ? getPage(pageId) : undefined;
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
    <Sheet open={!!pageId} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="sm:max-w-2xl w-full p-0 flex flex-col gap-0"
      >
        <SheetTitle className="sr-only">{page.title || "Untitled row"}</SheetTitle>
        <SheetDescription className="sr-only">Row detail</SheetDescription>
        <PageCommentsProvider pageId={page.id}>
          <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-2 shrink-0">
            <span className="text-xs text-muted-foreground">Row peek</span>
            <button
              onClick={() => { onOpenChange(false); navigate(`/p/${page.id}`); }}
              className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-accent"
            >
              <ExternalLink className="h-3 w-3" /> Open as page
            </button>
          </header>
          <div className="flex-1 overflow-y-auto scrollbar-thin px-6 md:px-10 py-8">
            <div className="flex items-start gap-2">
              <IconPickerPopover
                value={page.icon}
                onChange={(next) => updatePage(page.id, { icon: next })}
                onClear={() => updatePage(page.id, { icon: "📄" })}
              >
                <button
                  type="button"
                  className="text-4xl leading-none hover:bg-accent rounded-md p-1"
                  aria-label="Change icon"
                >
                  <DynamicIcon value={page.icon} />
                </button>
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
              <button
                onClick={async () => {
                  const newId = await addBlock(page.id, page.blocks.length - 1);
                  setTimeout(() => document.querySelector<HTMLElement>(`[data-block-id="${newId}"]`)?.focus(), 0);
                }}
                className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <Plus className="h-3 w-3" /> Add block
              </button>
            </div>
          </div>
        </PageCommentsProvider>
      </SheetContent>
    </Sheet>
  );
}

