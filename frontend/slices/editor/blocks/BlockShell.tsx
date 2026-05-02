import type { ReactNode, CSSProperties } from "react";
import { cn } from "@/shared/lib/utils";
import { useBlockSelectionOptional } from "@/slices/block-selection";

interface Props {
  children: ReactNode;
  controls: ReactNode;
  setNodeRef: (el: HTMLElement | null) => void;
  style?: CSSProperties;
  isDragging?: boolean;
  isOver?: boolean;
  attributes?: Record<string, unknown>;
  listeners?: Record<string, unknown>;
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
        "group/block relative rounded -mx-1 px-1 transition-colors",
        isDragging && "opacity-40",
        isOver && "before:absolute before:left-7 before:right-0 before:-top-0.5 before:h-0.5 before:bg-brand before:rounded",
        selected && "bg-brand/15 ring-2 ring-brand/60 ring-offset-0",
      )}
    >
      <div className="flex items-start gap-1">
        <div className={cn(
          "flex pt-1.5 transition",
          selected ? "opacity-100" : "opacity-0 group-hover/block:opacity-100 focus-within:opacity-100",
        )}>
          {controls}
        </div>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
