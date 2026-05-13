import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MoreHorizontal, Trash2 } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { focusSiblingBySelector, isTextInputTarget } from "@/shared/lib/keyboard";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { PropertyCell } from "../../PropertyCell";
import { InlineRowTitle } from "../../row";
import { SelectableCell } from "@/slices/database-cell-selection";
import { useRowSelectionOptional } from "../../row-selection";
import { RowCheckbox } from "./Checkboxes";

export function SortableRow({
  row, rowIndex, db, visibleProps, onOpen, onDelete, autoEdit, onAutoEditConsumed,
  selectedCell, onSelectCell, fill, wrap, rowHeightClass,
}: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.id });
  const rowSel = useRowSelectionOptional();
  const isRowSelected = !!rowSel?.isSelected(row.id);
  const onKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (isTextInputTarget(e.target)) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      focusSiblingBySelector(e.currentTarget, "[data-db-nav-item]", e.key === "ArrowDown" ? 1 : -1);
      return;
    }
    if (e.key === "Enter" && e.target === e.currentTarget) {
      e.preventDefault();
      onOpen();
    }
  };
  return (
    <div
      ref={setNodeRef as any}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      tabIndex={0}
      data-db-nav-item
      data-row-shell-id={row.id}
      onKeyDown={onKeyDown}
      className={cn(
        "flex border-b border-border last:border-b-0 hover:bg-muted/20 group transition-colors",
        rowHeightClass,
        wrap ? "items-start" : "items-stretch",
        isDragging && "opacity-40",
        isRowSelected && "bg-brand/15 ring-2 ring-brand/60 ring-inset",
      )}
    >
      <div className="w-12 shrink-0 flex items-center justify-center gap-0.5 border-r border-border">
        <RowCheckbox rowId={row.id} />
        <button {...attributes} {...listeners} aria-label="Drag to reorder" className="cursor-grab text-muted-foreground/30 hover:text-foreground opacity-0 group-hover:opacity-100">
          <GripVertical className="h-3 w-3" />
        </button>
      </div>
      {visibleProps.map((p: any, i: number) => {
        const isSel = selectedCell?.rowId === row.id && selectedCell?.propId === p.id;
        const inRange = fill.isInFillRange(rowIndex, p.id);
        return (
          <div key={p.id} className={cn(
            "border-r border-border min-w-[160px] flex-1 flex items-stretch relative",
            wrap ? "whitespace-normal break-words" : "truncate",
          )}>
            {i === 0 ? (
              <InlineRowTitle row={row} onOpen={onOpen} autoEdit={autoEdit} onAutoEditConsumed={onAutoEditConsumed} />
            ) : (
              <SelectableCell
                rowId={row.id}
                propId={p.id}
                selected={isSel}
                inFillRange={inRange}
                showFillHandle={isSel && !fill.isFilling}
                onSelect={() => onSelectCell({ rowId: row.id, propId: p.id })}
                onStartFill={() => fill.start({ rowId: row.id, propId: p.id, rowIndex })}
              >
                <PropertyCell db={db} prop={p} row={row} />
              </SelectableCell>
            )}
          </div>
        );
      })}
      <div className="w-8 shrink-0 flex items-center justify-center opacity-0 group-hover:opacity-100">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rounded p-1 hover:bg-accent text-muted-foreground"><MoreHorizontal className="h-3 w-3" /></button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onOpen}>Open</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={onDelete}><Trash2 className="mr-2 h-3.5 w-3.5" /> Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
