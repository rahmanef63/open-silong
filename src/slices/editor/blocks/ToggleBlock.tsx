import { useEffect, type CSSProperties } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ChevronRight, Plus } from "lucide-react";
import type { Block, BlockType } from "@/shared/types/domain";
import { useStore } from "@/shared/lib/store";
import { cn } from "@/shared/lib/utils";
import { BlockShell } from "./BlockShell";
import { BlockControls } from "./BlockControls";
import { NestedBlock } from "./NestedBlock";
import { bgColorClass, colorClass } from "../lib/colors";

interface Props {
  pageId: string;
  block: Block;
  index: number;
  setNodeRef: (el: HTMLElement | null) => void;
  style?: CSSProperties;
  isDragging?: boolean;
  isOver?: boolean;
  attributes?: Record<string, unknown>;
  listeners?: Record<string, unknown>;
  convertTo: (t: BlockType) => void;
}

const uid = () => Math.random().toString(36).slice(2, 10);

export function ToggleBlock({
  pageId, block, index, setNodeRef, style, isDragging, isOver: shellIsOver,
  attributes, listeners, convertTo,
}: Props) {
  const { updateBlock } = useStore();
  const collapsed = block.collapsed !== false;
  const children: Block[] = block.children ?? [];
  const { setNodeRef: setDropRef, isOver: dropIsOver } = useDroppable({ id: `toggle:${block.id}` });

  // Auto-expand on hover-while-dragging so the user sees their target
  useEffect(() => {
    if (collapsed && dropIsOver) updateBlock(pageId, block.id, { collapsed: false });
  }, [dropIsOver]);

  const addChild = () => {
    const nb: Block = { id: uid(), type: "paragraph", text: "" };
    updateBlock(pageId, block.id, { children: [...children, nb], collapsed: false });
    setTimeout(() => document.querySelector<HTMLElement>(`[data-block-id="tc_${block.id}_${children.length}"]`)?.focus(), 30);
  };

  return (
    <BlockShell
      setNodeRef={setNodeRef} style={style} isDragging={isDragging} isOver={shellIsOver}
      attributes={attributes} listeners={listeners}
      controls={<BlockControls pageId={pageId} block={block} index={index} listeners={listeners} convertTo={convertTo} />}
    >
      <div
        ref={setDropRef}
        className={cn(
          "rounded transition-colors",
          dropIsOver && "bg-brand/10 ring-2 ring-brand ring-inset",
          !dropIsOver && bgColorClass(block.bgColor),
        )}
      >
        <div className="flex items-start gap-1">
          <button
            onClick={() => updateBlock(pageId, block.id, { collapsed: !collapsed })}
            className="mt-1.5 shrink-0 text-muted-foreground hover:text-foreground transition"
          >
            <ChevronRight className={cn("h-4 w-4 transition-transform", !collapsed && "rotate-90")} />
          </button>
          <div
            data-block-id={block.id}
            contentEditable
            suppressContentEditableWarning
            onInput={(e) => updateBlock(pageId, block.id, { text: (e.currentTarget as HTMLElement).innerText })}
            data-placeholder="Toggle heading"
            className={cn(
              "flex-1 outline-none font-semibold text-base leading-7 py-0.5 whitespace-pre-wrap break-words empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/50",
              colorClass(block.color),
            )}
          >
            {block.text}
          </div>
        </div>
        {!collapsed && (
          <div className="ml-5 mt-1 border-l-2 border-border/60 pl-3 space-y-0.5">
            <SortableContext items={children.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            {children.map((child, ci) => (
              <NestedBlock
                key={child.id}
                block={child}
                onUpdate={(patch) => {
                  const nc = children.map((c, j) => (j === ci ? { ...c, ...patch } : c));
                  updateBlock(pageId, block.id, { children: nc });
                }}
                onDelete={() => {
                  const nc = children.filter((_, j) => j !== ci);
                  updateBlock(pageId, block.id, { children: nc });
                }}
                onAddAfter={(type) => {
                  const nb: Block = { id: uid(), type: type ?? "paragraph", text: "" };
                  const nc = [...children];
                  nc.splice(ci + 1, 0, nb);
                  updateBlock(pageId, block.id, { children: nc });
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
            ))}
            </SortableContext>
            <button
              onClick={addChild}
              className="flex items-center gap-1 text-xs text-muted-foreground/50 hover:text-muted-foreground"
            >
              <Plus className="h-3 w-3" /> Add inside toggle
            </button>
          </div>
        )}
      </div>
    </BlockShell>
  );
}

