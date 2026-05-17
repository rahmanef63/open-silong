import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { GripVertical } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Block, BlockType } from "@/shared/types/domain";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { SlashMenu } from "../SlashMenu";
import { bgColorClass, colorClass } from "../lib/colors";
import { nestedRegistry } from "./nestedRegistry";
import { NESTED_PLACEHOLDERS as PLACEHOLDERS } from "./placeholders";
import { NestedContent } from "./nested-block/NestedContent";
import { handleNestedInput, runNestedSlashSelect, handleNestedKeyDown } from "./nested-block/handlers";

interface Props {
  block: Block;
  onUpdate: (patch: Partial<Block>) => void;
  onAddAfter: (type?: BlockType) => void;
  onDelete: () => void;
  onFocusNext?: () => void;
  onFocusPrev?: () => void;
  registerRef?: (id: string, el: HTMLElement | null) => void;
  /** Nesting depth — 1 means direct child of a top-level container. */
  depth?: number;
  /** Owning page id — needed by leaf blocks (e.g. database). */
  pageId?: string;
}

export function NestedBlock({
  block, onUpdate, onAddAfter, onDelete, onFocusNext, onFocusPrev, registerRef, depth = 1, pageId,
}: Props) {
  const ref = useRef<HTMLElement | null>(null);
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");

  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } =
    useSortable({ id: block.id });
  const sortableStyle = {
    transform: isDragging ? undefined : CSS.Transform.toString(transform),
    transition,
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (document.activeElement === el) return;
    if (el.innerText !== block.text) el.innerText = block.text;
  }, [block.text, block.type]);

  const setRef = (el: HTMLElement | null) => {
    ref.current = el;
    registerRef?.(block.id, el);
  };

  const handleInput = (e: React.FormEvent<HTMLElement>) =>
    handleNestedInput(e, { block, onUpdate, setSlashOpen, setSlashQuery });

  const onSlashSelect = (type: BlockType) => {
    setSlashOpen(false);
    runNestedSlashSelect(type, block, onUpdate);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLElement>) =>
    handleNestedKeyDown(e, { block, slashOpen, onAddAfter, onDelete, onFocusNext, onFocusPrev });

  const textCls = colorClass(block.color);
  const bgCls = bgColorClass(block.bgColor);

  const baseProps = {
    "data-block-id": block.id,
    contentEditable: true,
    suppressContentEditableWarning: true,
    onInput: handleInput,
    onKeyDown: handleKeyDown,
    "data-placeholder": PLACEHOLDERS[block.type] ?? "",
    className: cn(
      "outline-none flex-1 min-w-0 whitespace-pre-wrap break-words empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/50",
      textCls,
    ),
  } as Record<string, unknown>;

  return (
    <div
      ref={setNodeRef as unknown as React.Ref<HTMLDivElement>}
      style={sortableStyle}
      {...attributes}
      data-block-shell-id={block.id}
      data-block-nested
      className={cn(
        "group/nested relative flex items-start gap-1 min-w-0",
        isDragging && "opacity-40",
        isOver && !isDragging && "before:absolute before:inset-x-0 before:-top-0.5 before:h-0.5 before:bg-brand before:rounded",
      )}
    >
      <Button
        variant="ghost"
        {...listeners}
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Drag block"
        className="mt-1 h-5 w-4 shrink-0 cursor-grab rounded p-0 text-muted-foreground/50 opacity-0 active:cursor-grabbing group-hover/nested:opacity-100 [&_svg]:size-3.5"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </Button>
      <div className={cn("relative flex-1 min-w-0", bgCls && "-mx-1 px-1 rounded", bgCls)}>
        <NestedContent
          block={block}
          baseProps={baseProps}
          setRef={setRef}
          handleKeyDown={handleKeyDown}
          onUpdate={onUpdate}
          depth={depth}
          pageId={pageId}
        />
        {slashOpen && (
          <div className="relative">
            <SlashMenu query={slashQuery} onSelect={onSlashSelect} onClose={() => setSlashOpen(false)} />
          </div>
        )}
      </div>
    </div>
  );
}

nestedRegistry.Nested = NestedBlock;
