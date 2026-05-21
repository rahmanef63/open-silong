import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Block, BlockType } from "@/shared/types/domain";
import { cn } from "@/shared/lib/utils";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/shared/ui/popover";
import { SlashMenu } from "../SlashMenu";
import { bgColorClass, colorClass } from "../lib/colors";
import { nestedRegistry } from "./nestedRegistry";
import { NESTED_PLACEHOLDERS as PLACEHOLDERS } from "./placeholders";
import { NestedContent } from "./nested-block/NestedContent";
import { handleNestedInput, runNestedSlashSelect, handleNestedKeyDown } from "./nested-block/handlers";
import { NestedBlockControls } from "./NestedBlockControls";

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
  /** 1-based ordinal for `numbered` blocks. Container computes it via
   *  `computeOrdinals(children)` (see lib/listOrdinals.ts). */
  ordinal?: number;
}

export function NestedBlock({
  block, onUpdate, onAddAfter, onDelete, onFocusNext, onFocusPrev, registerRef, depth = 1, pageId, ordinal,
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
    handleNestedKeyDown(e, { block, slashOpen, onAddAfter, onDelete, onFocusNext, onFocusPrev, onUpdate });

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
      <div className="mt-0.5 shrink-0 opacity-0 group-hover/nested:opacity-100 focus-within:opacity-100 transition-opacity">
        <NestedBlockControls
          block={block}
          pageId={pageId}
          listeners={listeners}
          onUpdate={onUpdate}
          onAddAfter={onAddAfter}
          onDelete={onDelete}
        />
      </div>
      <Popover open={slashOpen} onOpenChange={(o) => { if (!o) setSlashOpen(false); }} modal={false}>
        <PopoverAnchor asChild>
          <div className={cn("relative flex-1 min-w-0", bgCls && "-mx-1 px-1 rounded", bgCls)}>
            <NestedContent
              block={block}
              baseProps={baseProps}
              setRef={setRef}
              handleKeyDown={handleKeyDown}
              onUpdate={onUpdate}
              depth={depth}
              pageId={pageId}
              ordinal={ordinal}
            />
          </div>
        </PopoverAnchor>
        <PopoverContent
          side="bottom"
          align="start"
          sideOffset={4}
          className="w-72 max-h-72 overflow-y-auto p-1"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <SlashMenu
            query={slashQuery}
            onSelect={onSlashSelect}
            onClose={() => setSlashOpen(false)}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

nestedRegistry.Nested = NestedBlock;
