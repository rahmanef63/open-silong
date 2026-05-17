import { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";

interface Props {
  rowId: string;
  propId: string;
  selected: boolean;
  inFillRange: boolean;
  showFillHandle: boolean;
  onSelect: () => void;
  onStartFill: (e: React.MouseEvent) => void;
  children: ReactNode;
}

export function SelectableCell({
  rowId, propId, selected, inFillRange, showFillHandle, onSelect, onStartFill, children,
}: Props) {
  return (
    <div
      data-fill-row-id={rowId}
      data-fill-prop-id={propId}
      onMouseDownCapture={(e) => {
        if ((e.target as HTMLElement).closest("[data-fill-handle]")) return;
        onSelect();
      }}
      className={cn(
        "relative w-full h-full",
        selected && "ring-1 ring-brand ring-inset",
        inFillRange && !selected && "bg-brand/10",
      )}
    >
      {children}
      {showFillHandle && (
        <Button
          data-fill-handle
          type="button"
          size="icon"
          onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); onStartFill(e); }}
          className="absolute -bottom-1 -right-1 h-2 w-2 p-0 rounded-sm bg-brand border border-background cursor-crosshair z-10 hover:bg-brand"
          aria-label="Fill down"
        />
      )}
    </div>
  );
}
