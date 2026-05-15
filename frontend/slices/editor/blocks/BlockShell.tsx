import type { ReactNode, CSSProperties } from "react";
import type { DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import { cn } from "@/shared/lib/utils";
import { useBlockSelectionOptional } from "@/slices/block-selection";

interface Props {
  children: ReactNode;
  controls: ReactNode;
  setNodeRef: (el: HTMLElement | null) => void;
  style?: CSSProperties;
  isDragging?: boolean;
  isOver?: boolean;
  attributes?: DraggableAttributes;
  listeners?: SyntheticListenerMap;
  /** Top-level block id — when present, the shell participates in multi-select. */
  blockId?: string;
}

export function BlockShell({
  children, controls, setNodeRef, style, isDragging = false, isOver = false, attributes, blockId,
}: Props) {
  const sel = useBlockSelectionOptional();
  const selected = !!(blockId && sel?.isSelected(blockId));
  return (
    <div
      ref={setNodeRef as unknown as React.Ref<HTMLDivElement>}
      style={style}
      {...attributes}
      data-block-shell-id={blockId}
      data-block-selected={selected || undefined}
      className={cn(
        "group/block relative rounded py-[6px] transition-colors",
        isDragging && "opacity-40",
        isOver && "before:absolute before:left-0 before:right-0 before:-top-0.5 before:h-0.5 before:bg-brand before:rounded",
        selected && "bg-brand/15 ring-2 ring-brand/60 ring-offset-0",
      )}
    >
      <div
        className={cn(
          "absolute right-full top-[7px] mr-1 hidden md:flex transition",
          selected ? "opacity-100" : "opacity-0 group-hover/block:opacity-100 focus-within:opacity-100",
        )}
      >
        {controls}
      </div>
      {/* Edge-grab strips — let users tap the top/bottom border of a
          block (especially containers like columns / toggle / synced
          where the body steals all clicks for inner CRUD) to select
          THIS block as a whole. Tiny so they don't hijack normal text
          selection in the body. Modifier-aware: shift = range,
          meta/ctrl = toggle. */}
      {blockId && sel && (
        <>
          <div
            aria-hidden
            data-block-edge="top"
            onPointerDown={(e) => {
              if (e.button !== 0) return;
              e.stopPropagation();
              if (e.shiftKey) sel.range(blockId);
              else if (e.metaKey || e.ctrlKey) sel.toggle(blockId);
              else sel.selectOne(blockId);
            }}
            className="absolute inset-x-0 top-0 h-1.5 cursor-pointer hover:bg-brand/20"
          />
          <div
            aria-hidden
            data-block-edge="bottom"
            onPointerDown={(e) => {
              if (e.button !== 0) return;
              e.stopPropagation();
              if (e.shiftKey) sel.range(blockId);
              else if (e.metaKey || e.ctrlKey) sel.toggle(blockId);
              else sel.selectOne(blockId);
            }}
            className="absolute inset-x-0 bottom-0 h-1.5 cursor-pointer hover:bg-brand/20"
          />
        </>
      )}
      <div className="min-w-0">{children}</div>
    </div>
  );
}
