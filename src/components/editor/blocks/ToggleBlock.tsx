import { useEffect, useRef, type CSSProperties, type KeyboardEvent } from "react";
import { ChevronRight, Plus } from "lucide-react";
import type { Block, BlockType } from "@/lib/types";
import { useStore } from "@/lib/store";
import { cn } from "@/shared/lib/utils";
import { BlockShell } from "./BlockShell";
import { BlockControls } from "./BlockControls";

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
  pageId, block, index, setNodeRef, style, isDragging, isOver,
  attributes, listeners, convertTo,
}: Props) {
  const { updateBlock } = useStore();
  const collapsed = block.collapsed !== false;
  const children: Block[] = block.children ?? [];

  const addChild = () => {
    const nb: Block = { id: uid(), type: "paragraph", text: "" };
    updateBlock(pageId, block.id, { children: [...children, nb], collapsed: false });
    setTimeout(() => document.querySelector<HTMLElement>(`[data-block-id="tc_${block.id}_${children.length}"]`)?.focus(), 30);
  };

  return (
    <BlockShell
      setNodeRef={setNodeRef} style={style} isDragging={isDragging} isOver={isOver}
      attributes={attributes} listeners={listeners}
      controls={<BlockControls pageId={pageId} block={block} index={index} listeners={listeners} convertTo={convertTo} />}
    >
      <div>
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
            className="flex-1 outline-none font-semibold text-base leading-7 py-0.5 whitespace-pre-wrap break-words empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/50"
          >
            {block.text}
          </div>
        </div>
        {!collapsed && (
          <div className="ml-5 mt-1 border-l-2 border-border/60 pl-3 space-y-0.5">
            {children.map((child, ci) => (
              <ToggleChild
                key={child.id}
                child={child}
                index={ci}
                parentId={block.id}
                onUpdate={(patch) => {
                  const nc = children.map((c, j) => (j === ci ? { ...c, ...patch } : c));
                  updateBlock(pageId, block.id, { children: nc });
                }}
                onDelete={() => {
                  const nc = children.filter((_, j) => j !== ci);
                  updateBlock(pageId, block.id, { children: nc.length ? nc : [] });
                }}
                onAddAfter={() => {
                  const nb: Block = { id: uid(), type: "paragraph", text: "" };
                  const nc = [...children];
                  nc.splice(ci + 1, 0, nb);
                  updateBlock(pageId, block.id, { children: nc });
                  setTimeout(() => document.querySelector<HTMLElement>(`[data-toggle-child="${block.id}_${ci + 1}"]`)?.focus(), 30);
                }}
              />
            ))}
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

interface ChildProps {
  child: Block;
  index: number;
  parentId: string;
  onUpdate: (patch: Partial<Block>) => void;
  onDelete: () => void;
  onAddAfter: () => void;
}

function ToggleChild({ child, index, parentId, onUpdate, onDelete, onAddAfter }: ChildProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (ref.current && ref.current.innerText !== child.text) ref.current.innerText = child.text;
  }, [child.text]);

  return (
    <div
      data-toggle-child={`${parentId}_${index}`}
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onInput={(e) => onUpdate({ text: (e.currentTarget as HTMLElement).innerText })}
      onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
        const el = e.currentTarget;
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onAddAfter(); }
        if (e.key === "Backspace" && el.innerText === "") { e.preventDefault(); onDelete(); }
      }}
      data-placeholder="Write inside toggle…"
      className="outline-none text-sm leading-6 py-0.5 whitespace-pre-wrap break-words empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/40"
    />
  );
}
