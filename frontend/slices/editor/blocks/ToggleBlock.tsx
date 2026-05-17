import { useEffect, useRef, type CSSProperties } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ChevronRight, Plus } from "lucide-react";
import type { Block, BlockType } from "@/shared/types/domain";
import { useStore } from "@/shared/lib/store";
import { cn } from "@/shared/lib/utils";
import { uid } from "@/shared/lib/uid";
import { BlockShell } from "./BlockShell";
import { BlockControls } from "./BlockControls";
import { requireNested } from "./nestedRegistry";
import { bgColorClass, colorClass } from "../lib/colors";
import { Button } from "@/shared/ui/button";

/** Body of a toggle block — chevron + heading + children list.
 * Pure callback API so it can be reused both at the top level (wrapped in BlockShell)
 * and recursively inside NestedBlock. `depth` is the depth assigned to inner
 * NestedBlocks; top-level = 1, nested = parent depth + 1.
 */
export function ToggleContent({
  block, onUpdate, depth = 1, pageId,
}: {
  block: Block;
  onUpdate: (patch: Partial<Block>) => void;
  depth?: number;
  pageId?: string;
}) {
  const collapsed = block.collapsed !== false;
  const children: Block[] = block.children ?? [];
  const { setNodeRef: setDropRef, isOver: dropIsOver } = useDroppable({ id: `toggle:${block.id}` });
  const headRef = useRef<HTMLDivElement | null>(null);

  // Auto-expand on hover-while-dragging so the user sees their target
  useEffect(() => {
    if (collapsed && dropIsOver) onUpdate({ collapsed: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dropIsOver]);

  // Sync heading text from store to DOM only when not focused — avoids caret-jump on fast typing.
  useEffect(() => {
    const el = headRef.current;
    if (!el) return;
    if (document.activeElement === el) return;
    if (el.innerText !== block.text) el.innerText = block.text;
  }, [block.text]);

  const setChildren = (next: Block[]) => onUpdate({ children: next });

  const addChild = () => {
    const nb: Block = { id: uid(), type: "paragraph", text: "" };
    onUpdate({ children: [...children, nb], collapsed: false });
    setTimeout(() => document.querySelector<HTMLElement>(`[data-block-id="${nb.id}"]`)?.focus(), 30);
  };

  return (
    <div
      ref={setDropRef}
      className={cn(
        "rounded transition-colors",
        dropIsOver && "bg-brand/10 ring-2 ring-brand ring-inset",
        !dropIsOver && bgColorClass(block.bgColor),
      )}
    >
      <div className="flex items-start gap-1">
        <Button
          variant="ghost"
          onClick={() => onUpdate({ collapsed: !collapsed })}
          className="mt-1.5 h-auto shrink-0 p-0 text-muted-foreground transition hover:bg-transparent hover:text-foreground [&_svg]:size-4"
        >
          <ChevronRight className={cn("h-4 w-4 transition-transform", !collapsed && "rotate-90")} />
        </Button>
        <div
          ref={headRef}
          data-block-id={block.id}
          contentEditable
          suppressContentEditableWarning
          onInput={(e) => onUpdate({ text: (e.currentTarget as HTMLElement).innerText })}
          data-placeholder="Toggle heading"
          className={cn(
            "flex-1 outline-none font-semibold text-base leading-7 py-0.5 whitespace-pre-wrap break-words empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/50",
            colorClass(block.color),
          )}
        />
      </div>
      {!collapsed && (
        <div
          className="ml-5 mt-1 border-l-2 border-border/60 pl-3 space-y-0.5 cursor-text"
          onClick={(e) => {
            if (e.target !== e.currentTarget) return;
            const last = children[children.length - 1];
            if (last) {
              document.querySelector<HTMLElement>(`[data-block-id="${last.id}"]`)?.focus();
            } else {
              addChild();
            }
          }}
        >
          <SortableContext items={children.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            {children.map((child, ci) => {
              const NestedBlock = requireNested();
              return (
                <NestedBlock
                  key={child.id}
                  block={child}
                  depth={depth}
                  pageId={pageId}
                  onUpdate={(patch: Partial<Block>) => {
                    setChildren(children.map((c, j) => (j === ci ? { ...c, ...patch } : c)));
                  }}
                  onDelete={() => {
                    setChildren(children.filter((_, j) => j !== ci));
                  }}
                  onAddAfter={(type: BlockType) => {
                    const nb: Block = { id: uid(), type: type ?? "paragraph", text: "" };
                    const nc = [...children];
                    nc.splice(ci + 1, 0, nb);
                    setChildren(nc);
                    setTimeout(() => document.querySelector<HTMLElement>(`[data-block-id="${nb.id}"]`)?.focus(), 30);
                  }}
                  onFocusNext={() => {
                    const next = children[ci + 1];
                    if (next) document.querySelector<HTMLElement>(`[data-block-id="${next.id}"]`)?.focus();
                  }}
                  onFocusPrev={() => {
                    const prev = children[ci - 1];
                    if (prev) document.querySelector<HTMLElement>(`[data-block-id="${prev.id}"]`)?.focus();
                  }}
                />
              );
            })}
          </SortableContext>
          <Button
            variant="ghost"
            onClick={addChild}
            className="h-auto gap-1 p-0 text-xs font-normal text-muted-foreground/50 hover:bg-transparent hover:text-muted-foreground [&_svg]:size-3"
          >
            <Plus className="h-3 w-3" /> Add inside toggle
          </Button>
        </div>
      )}
    </div>
  );
}

/** Top-level toggle block — wraps ToggleContent in BlockShell + BlockControls. */
interface Props {
  pageId: string;
  block: Block;
  index: number;
  setNodeRef: (el: HTMLElement | null) => void;
  style?: CSSProperties;
  isDragging?: boolean;
  isOver?: boolean;
  attributes?: import("@dnd-kit/core").DraggableAttributes;
  listeners?: import("@dnd-kit/core/dist/hooks/utilities").SyntheticListenerMap;
  convertTo: (t: BlockType) => void;
}

export function ToggleBlock({
  pageId, block, index, setNodeRef, style, isDragging, isOver: shellIsOver,
  attributes, listeners, convertTo,
}: Props) {
  const { updateBlock } = useStore();
  return (
    <BlockShell
      setNodeRef={setNodeRef} style={style} isDragging={isDragging} isOver={shellIsOver}
      attributes={attributes} listeners={listeners} blockId={block.id}
      controls={<BlockControls pageId={pageId} block={block} index={index} listeners={listeners} convertTo={convertTo} />}
    >
      <ToggleContent
        block={block}
        onUpdate={(patch) => updateBlock(pageId, block.id, patch)}
        depth={1}
        pageId={pageId}
      />
    </BlockShell>
  );
}
