import { useDroppable } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { colorClass } from "@/shared/lib/format";
import type { Page } from "@/shared/types/domain";
import { BoardCard } from "./BoardCard";

export function BoardColumn({ db, col, groupProp, onAdd, onOpen, cardPadding, cardSpacing, colorByProp, cardPropIds, viewVisible }: any) {
  // Sortable identity for column reorder — keep separate from `col_*` drop
  // target so cards continue to drop into columns without triggering a sort.
  const sortable = useSortable({ id: `colsort_${col.id ?? "null"}`, disabled: col.id === null });
  const drop = useDroppable({ id: `col_${col.id ?? "null"}` });
  const setRefs = (el: HTMLElement | null) => {
    sortable.setNodeRef(el);
    drop.setNodeRef(el);
  };
  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
  };
  return (
    <div
      ref={setRefs}
      style={style}
      className={cn(
        "w-64 shrink-0 rounded-lg bg-muted/40 p-2 transition",
        drop.isOver && "ring-2 ring-brand bg-muted/70",
        sortable.isDragging && "opacity-50",
      )}
    >
      <div className="flex items-center justify-between px-1 mb-2">
        <div className="flex items-center gap-2">
          {col.id !== null && (
            <button
              {...sortable.attributes}
              {...sortable.listeners}
              aria-label="Reorder column"
              className="rounded p-0.5 text-muted-foreground hover:bg-accent cursor-grab active:cursor-grabbing"
            >
              <GripVertical className="h-3 w-3" />
            </button>
          )}
          {col.option ? (
            <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs", colorClass(col.option.color))}>{col.option.name}</span>
          ) : (
            <span className="text-xs text-muted-foreground">No {groupProp.name}</span>
          )}
          <span className="text-xs text-muted-foreground">{col.rows.length}</span>
        </div>
        <button onClick={onAdd} className="rounded p-1 hover:bg-accent text-muted-foreground"><Plus className="h-3 w-3" /></button>
      </div>
      <div className={cardSpacing}>
        {col.rows.map((r: Page) => (
          <BoardCard
            key={r.id} row={r} db={db}
            onOpen={() => onOpen(r.id)}
            cardPadding={cardPadding}
            colorByProp={colorByProp}
            cardPropIds={cardPropIds}
            viewVisible={viewVisible}
          />
        ))}
      </div>
    </div>
  );
}
