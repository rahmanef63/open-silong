import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MoreHorizontal, Trash2, ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { focusSiblingBySelector, isTextInputTarget } from "@/shared/lib/keyboard";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { Button } from "@/shared/ui/button";
import { PropertyCell } from "../../PropertyCell";
import { InlineRowTitle } from "../../row";
import { SelectableCell } from "@/slices/database-cell-selection";
import { useRowSelectionOptional } from "../../row-selection";
import { RowCheckbox } from "./Checkboxes";

export function SortableRow({
  row, rowIndex, db, visibleProps, onOpen, onDelete, autoEdit, onAutoEditConsumed,
  selectedCell, onSelectCell, fill, wrap, rowHeightClass,
  treeEnabled = false, depth = 0, hasChildren = false, expanded = true, onToggleExpand,
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
        <Button variant="ghost" size="icon" {...attributes} {...listeners} aria-label="Drag to reorder" className="h-auto w-auto p-0 cursor-grab text-muted-foreground/30 hover:text-foreground hover:bg-transparent opacity-0 group-hover:opacity-100 [&_svg]:size-3">
          <GripVertical className="h-3 w-3" />
        </Button>
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
              <div className="flex items-stretch flex-1 min-w-0">
                {treeEnabled && (
                  <div
                    className="flex items-center shrink-0"
                    style={{ paddingLeft: `${depth * 16}px` }}
                  >
                    {hasChildren ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={(e) => { e.stopPropagation(); onToggleExpand?.(); }}
                        aria-label={expanded ? "Collapse sub-items" : "Expand sub-items"}
                        className="h-5 w-5 p-0 text-muted-foreground rounded [&_svg]:size-3.5"
                      >
                        {expanded
                          ? <ChevronDown className="h-3.5 w-3.5" />
                          : <ChevronRight className="h-3.5 w-3.5" />}
                      </Button>
                    ) : (
                      <span aria-hidden className="h-5 w-5 inline-block" />
                    )}
                  </div>
                )}
                <InlineRowTitle row={row} onOpen={onOpen} autoEdit={autoEdit} onAutoEditConsumed={onAutoEditConsumed} />
              </div>
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
            <Button variant="ghost" size="icon" className="h-auto w-auto p-1 text-muted-foreground [&_svg]:size-3"><MoreHorizontal className="h-3 w-3" /></Button>
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
