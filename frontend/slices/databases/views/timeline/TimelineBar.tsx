import { useRef } from "react";
import { cn } from "@/shared/lib/utils";
import { focusSiblingBySelector } from "@/shared/lib/keyboard";
import { colorClass } from "@/shared/lib/format";
import type { Page, Property } from "@/shared/types/domain";

export function TimelineBar({
  row, item, bar, cellW, colorProp, onOpenRow, onShift,
}: {
  row: Page;
  item: { startMs: number; endMs: number };
  bar: { left: number; width: number };
  cellW: number;
  colorProp: Property | undefined;
  onOpenRow: (id: string) => void;
  onShift: (deltaDays: number, mode: "move" | "start" | "end") => void;
}) {
  const draggingRef = useRef<{ mode: "move" | "start" | "end"; startX: number; lastDelta: number } | null>(null);
  const movedRef = useRef(false);

  const colorOpt = colorProp
    ? colorProp.options?.find((o: any) => o.id === row.rowProps?.[colorProp.id])
    : null;
  const tone = colorOpt?.color
    ? colorClass(colorOpt.color)
    : "bg-brand/70 hover:bg-brand text-brand-foreground";

  const beginDrag = (e: React.PointerEvent<HTMLElement>, mode: "move" | "start" | "end") => {
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    draggingRef.current = { mode, startX: e.clientX, lastDelta: 0 };
    movedRef.current = false;
  };
  const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const st = draggingRef.current;
    if (!st) return;
    const delta = Math.round((e.clientX - st.startX) / cellW);
    if (delta !== st.lastDelta) {
      movedRef.current = true;
      st.lastDelta = delta;
    }
  };
  const onPointerUp = (e: React.PointerEvent<HTMLElement>) => {
    const st = draggingRef.current;
    draggingRef.current = null;
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    if (!st) return;
    if (st.lastDelta !== 0) onShift(st.lastDelta, st.mode);
    setTimeout(() => { movedRef.current = false; }, 0);
  };

  return (
    <div
      className={cn(
        "absolute top-1 h-6 rounded-full text-[10px] font-medium truncate flex items-center transition z-10 border select-none",
        "cursor-grab active:cursor-grabbing",
        tone,
      )}
      style={{ left: bar.left, width: bar.width }}
      onPointerDown={(e) => beginDrag(e, "move")}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onClick={() => { if (!movedRef.current) onOpenRow(row.id); }}
      onKeyDown={(e) => {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          focusSiblingBySelector(e.currentTarget, "[data-db-nav-item]", e.key === "ArrowDown" ? 1 : -1);
        }
      }}
      tabIndex={0}
      role="button"
      data-db-nav-item
      title={colorOpt?.name ?? "Drag to move · Drag edges to resize"}
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-foreground/20 rounded-l-full"
        onPointerDown={(e) => beginDrag(e, "start")}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      />
      <span className="px-2 truncate flex-1 pointer-events-none">
        {bar.width > 40 && (row.title || "Untitled")}
      </span>
      <div
        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-foreground/20 rounded-r-full"
        onPointerDown={(e) => beginDrag(e, "end")}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      />
    </div>
  );
}
