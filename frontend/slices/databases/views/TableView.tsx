import { useRef, useState } from "react";
import { Database, DatabaseViewConfig, Page, Property, PropertyType } from "@/shared/types/domain";
import { useStore } from "@/shared/lib/store";
import { PropertyCell } from "../PropertyCell";
import { PROPERTY_TYPE_LABELS } from "../DatabaseBlock";
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, horizontalListSortingStrategy, verticalListSortingStrategy, useSortable, sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical, MoreHorizontal, Trash2, Check, Minus,
  Type, Hash, ChevronDown, Tags, Circle, Calendar, User, CheckSquare,
  Link2, Mail, Phone, Paperclip, ArrowUpRight, Sigma, Calculator, Clock,
  UserCheck, Fingerprint,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { focusSiblingBySelector, isTextInputTarget } from "@/shared/lib/keyboard";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator, DropdownMenuLabel, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger,
} from "@/shared/ui/dropdown-menu";
import { AddColumnHeader, AddRowFooter, InlineRowTitle } from "@/slices/database-row";
import { useDragFill, SelectableCell, type FillSource } from "@/slices/database-cell-selection";
import {
  RowMarqueeOverlay, useRowSelection, useRowSelectionOptional,
} from "@/slices/database-row-selection";
import { getVisibleProps } from "../lib/visibility";
import { PropertyConfigPanel } from "../components/PropertyConfigPanel";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";

const PROP_TYPE_ICON: Record<PropertyType, React.ElementType> = {
  text: Type, number: Hash, select: ChevronDown, multi_select: Tags,
  status: Circle, date: Calendar, person: User, checkbox: CheckSquare,
  url: Link2, email: Mail, phone: Phone, files: Paperclip, relation: ArrowUpRight,
  rollup: Sigma, formula: Calculator, created_time: Clock, last_edited_time: Clock,
  created_by: UserCheck, last_edited_by: UserCheck, unique_id: Fingerprint,
};

interface ViewProps { db: Database; view: DatabaseViewConfig; rows: Page[]; onOpenRow: (id: string) => void }

export function TableView({ db, view, rows, onOpenRow }: ViewProps) {
  const { reorderProperties, reorderRows, addRow, deleteRow, setRowValue } = useStore();
  const wrap = !!view.tableWrapCells;
  const rowHeight = view.tableRowHeight ?? "medium";
  const rowHeightClass =
    rowHeight === "short" ? "min-h-7" : rowHeight === "tall" ? "min-h-12" : "min-h-9";
  const [pendingFocusId, setPendingFocusId] = useState<string | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ rowId: string; propId: string } | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const tableScrollRef = useRef<HTMLDivElement | null>(null);

  const visibleProps = getVisibleProps(db, view);
  const rowIds = rows.map(r => r.id);

  const onFill = (source: FillSource, targets: string[]) => {
    const srcRow = rows.find(r => r.id === source.rowId);
    if (!srcRow) return;
    const value = srcRow.rowProps?.[source.propId];
    if (value === undefined) return;
    targets.forEach(rid => setRowValue(db.id, rid, source.propId, value));
  };
  const fill = useDragFill({ rowIds, onFill });

  const onColEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = visibleProps.map(p => p.id);
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    const next = [...ids];
    next.splice(to, 0, next.splice(from, 1)[0]);
    const hiddenInView = db.properties.filter(p => !visibleProps.includes(p)).map(p => p.id);
    reorderProperties(db.id, [...next, ...hiddenInView]);
  };

  const onRowEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = rows.map(r => r.id);
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    const next = [...ids];
    next.splice(to, 0, next.splice(from, 1)[0]);
    reorderRows(db.id, next);
  };

  return (
    <div ref={tableScrollRef} className="relative overflow-x-auto">
      <RowMarqueeOverlay containerRef={tableScrollRef} />
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onColEnd}>
        <SortableContext items={visibleProps.map(p => p.id)} strategy={horizontalListSortingStrategy}>
          <div className="min-w-full">
            <div className="flex border-b border-border bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              <HeaderCheckboxGutter rowIds={rowIds} />
              {visibleProps.map(p => <SortableHeader key={p.id} prop={p} db={db} />)}
              <AddColumnHeader dbId={db.id} />
            </div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onRowEnd}>
              <SortableContext items={rows.map(r => r.id)} strategy={verticalListSortingStrategy}>
                {rows.map((row, rowIndex) => (
                  <SortableRow
                    key={row.id}
                    row={row}
                    rowIndex={rowIndex}
                    db={db}
                    visibleProps={visibleProps}
                    onOpen={() => onOpenRow(row.id)}
                    onDelete={() => deleteRow(db.id, row.id)}
                    autoEdit={pendingFocusId === row.id}
                    onAutoEditConsumed={() => setPendingFocusId(null)}
                    selectedCell={selectedCell}
                    onSelectCell={setSelectedCell}
                    fill={fill}
                    wrap={wrap}
                    rowHeightClass={rowHeightClass}
                  />
                ))}
              </SortableContext>
            </DndContext>
            <AddRowFooter onAdd={async () => {
              const r = await addRow(db.id);
              setPendingFocusId(r.id);
            }} />
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function HeaderCheckboxGutter({ rowIds }: { rowIds: string[] }) {
  const sel = useRowSelection();
  const total = rowIds.length;
  const selectedCount = rowIds.filter((id) => sel.isSelected(id)).length;
  const state: "checked" | "indeterminate" | "unchecked" =
    selectedCount === 0 ? "unchecked" : selectedCount === total ? "checked" : "indeterminate";
  const onClick = () => {
    if (state === "checked") sel.clear();
    else sel.setIds(rowIds);
  };
  return (
    <div className="w-12 shrink-0 flex items-center justify-center border-r border-border">
      <button
        type="button"
        role="checkbox"
        aria-checked={state === "indeterminate" ? "mixed" : state === "checked"}
        aria-label={state === "checked" ? "Clear selection" : "Select all rows"}
        title={state === "checked" ? "Clear selection" : "Select all"}
        onClick={onClick}
        className={cn(
          "h-4 w-4 rounded-sm border flex items-center justify-center transition",
          state !== "unchecked"
            ? "bg-primary border-primary text-primary-foreground"
            : "border-muted-foreground/40 hover:border-foreground",
        )}
      >
        {state === "checked" && <Check className="h-3 w-3" />}
        {state === "indeterminate" && <Minus className="h-3 w-3" />}
      </button>
    </div>
  );
}

function RowCheckbox({ rowId }: { rowId: string }) {
  const sel = useRowSelection();
  const checked = sel.isSelected(rowId);
  const onClick = (e: React.MouseEvent) => { e.stopPropagation(); sel.toggle(rowId); };
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={checked ? "Deselect row" : "Select row"}
      onClick={onClick}
      onMouseDown={(e) => e.stopPropagation()}
      className={cn(
        "h-4 w-4 rounded-sm border flex items-center justify-center transition shrink-0",
        checked
          ? "bg-primary border-primary text-primary-foreground"
          : "border-muted-foreground/40 hover:border-foreground opacity-60 group-hover:opacity-100",
      )}
    >
      {checked && <Check className="h-3 w-3" />}
    </button>
  );
}

function SortableHeader({ prop, db }: { prop: Property; db: Database }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: prop.id });
  const [popOpen, setPopOpen] = useState(false);
  const TypeIcon = PROP_TYPE_ICON[prop.type];

  return (
    <div
      ref={setNodeRef as any}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="flex items-center gap-1 border-r border-border px-1 py-1.5 min-w-[160px] flex-1"
    >
      <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground/40 hover:text-foreground shrink-0">
        <GripVertical className="h-3 w-3" />
      </button>
      <TypeIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-label={PROPERTY_TYPE_LABELS[prop.type]} />
      <Popover open={popOpen} onOpenChange={setPopOpen}>
        <PopoverTrigger asChild>
          <button
            className="flex-1 text-left truncate text-xs hover:text-foreground min-w-0"
            title={`${PROPERTY_TYPE_LABELS[prop.type]} — click to configure`}
          >
            {prop.name}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" sideOffset={4} className="p-0 w-auto">
          <PropertyConfigPanel
            db={db}
            prop={prop}
            onClose={() => setPopOpen(false)}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function SortableRow({ row, rowIndex, db, visibleProps, onOpen, onDelete, autoEdit, onAutoEditConsumed, selectedCell, onSelectCell, fill, wrap, rowHeightClass }: any) {
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
