import type { ReactNode, CSSProperties } from "react";
import { cn } from "@/shared/lib/utils";

interface Props {
  children: ReactNode;
  controls: ReactNode;
  setNodeRef: (el: HTMLElement | null) => void;
  style?: CSSProperties;
  isDragging?: boolean;
  isOver?: boolean;
  attributes?: Record<string, unknown>;
  listeners?: Record<string, unknown>;
}

export function BlockShell({
  children, controls, setNodeRef, style, isDragging = false, isOver = false, attributes,
}: Props) {
  return (
    <div
      ref={setNodeRef as unknown as React.Ref<HTMLDivElement>}
      style={style}
      {...attributes}
      className={cn(
        "group/block relative",
        isDragging && "opacity-40",
        isOver && "before:absolute before:left-7 before:right-0 before:-top-0.5 before:h-0.5 before:bg-brand before:rounded",
      )}
    >
      <div className="flex items-start gap-1">
        <div className="flex pt-1.5 opacity-0 group-hover/block:opacity-100 focus-within:opacity-100 transition">
          {controls}
        </div>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
