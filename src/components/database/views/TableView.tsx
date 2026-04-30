import { useState } from "react";
import { Database, DatabaseViewConfig, Page, Property, PropertyType } from "@/lib/types";
import { useStore } from "@/lib/store";
import { PropertyCell } from "../PropertyCell";
import { PROPERTY_TYPE_LABELS } from "../DatabaseBlock";
import { useNavigate } from "react-router-dom";
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, horizontalListSortingStrategy, verticalListSortingStrategy, useSortable, sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MoreHorizontal, Trash2, Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator, DropdownMenuLabel, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";

interface ViewProps { db: Database; view: DatabaseViewConfig; rows: Page[] }

export function TableView({ db, view, rows }: ViewProps) {
  const { reorderProperties, reorderRows, addRow, deleteRow } = useStore();
  const navigate = useNavigate();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const visibleProps = db.properties.filter(p => !p.hidden);

  const onColEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = visibleProps.map(p => p.id);
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    const next = [...ids];
    next.splice(to, 0, next.splice(from, 1)[0]);
    const hidden = db.properties.filter(p => p.hidden).map(p => p.id);
    reorderProperties(db.id, [...next, ...hidden]);
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
    <div className="overflow-x-auto">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onColEnd}>
        <SortableContext items={visibleProps.map(p => p.id)} strategy={horizontalListSortingStrategy}>
          <div className="min-w-full">
            <div className="flex border-b border-border bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              <div className="w-8 shrink-0 border-r border-border" />
              {visibleProps.map(p => <SortableHeader key={p.id} prop={p} db={db} />)}
            </div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onRowEnd}>
              <SortableContext items={rows.map(r => r.id)} strategy={verticalListSortingStrategy}>
                {rows.map(row => (
                  <SortableRow key={row.id} row={row} db={db} visibleProps={visibleProps} onOpen={() => navigate(`/p/${row.id}`)} onDelete={() => deleteRow(db.id, row.id)} />
                ))}
              </SortableContext>
            </DndContext>
            <button
              onClick={() => { const r = addRow(db.id); navigate(`/p/${r.id}`); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:bg-accent border-t border-border"
            >
              <Plus className="h-3 w-3" /> New row
            </button>
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SortableHeader({ prop, db }: { prop: Property; db: Database }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: prop.id });
  const { updateProperty, deleteProperty } = useStore();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(prop.name);

  const commit = () => {
    setEditing(false);
    if (draft.trim()) updateProperty(db.id, prop.id, { name: draft.trim() });
    else setDraft(prop.name);
  };

  return (
    <div
      ref={setNodeRef as any}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="flex items-center gap-1 border-r border-border px-1 py-1.5 min-w-[160px] flex-1"
    >
      <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground/40 hover:text-foreground shrink-0">
        <GripVertical className="h-3 w-3" />
      </button>
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setEditing(false); setDraft(prop.name); } }}
          className="flex-1 bg-background border border-brand rounded px-1 text-xs outline-none min-w-0"
        />
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onDoubleClick={() => { setDraft(prop.name); setEditing(true); }}
              className="flex-1 text-left truncate text-xs hover:text-foreground min-w-0"
            >
              {prop.name}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            <DropdownMenuItem onClick={() => { setDraft(prop.name); setEditing(true); }}>
              Rename
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Change type</DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="max-h-72 overflow-y-auto">
                <DropdownMenuLabel className="text-xs">Property type</DropdownMenuLabel>
                {(Object.keys(PROPERTY_TYPE_LABELS) as PropertyType[]).map(t => (
                  <DropdownMenuItem key={t} onClick={() => updateProperty(db.id, prop.id, { type: t })}>
                    {prop.type === t && <Check className="mr-2 h-3.5 w-3.5" />}
                    {prop.type !== t && <span className="mr-2 w-3.5 inline-block" />}
                    {PROPERTY_TYPE_LABELS[t]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={() => deleteProperty(db.id, prop.id)}>
              <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete property
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

function SortableRow({ row, db, visibleProps, onOpen, onDelete }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.id });
  return (
    <div
      ref={setNodeRef as any}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("flex border-b border-border last:border-b-0 hover:bg-muted/20 group", isDragging && "opacity-40")}
    >
      <div className="w-8 shrink-0 flex items-center justify-center border-r border-border">
        <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground/30 hover:text-foreground opacity-0 group-hover:opacity-100">
          <GripVertical className="h-3 w-3" />
        </button>
      </div>
      {visibleProps.map((p: any, i: number) => (
        <div key={p.id} className="border-r border-border min-w-[160px] flex-1 flex items-center">
          {i === 0 ? (
            <button onClick={onOpen} className="flex w-full items-center gap-1 text-left text-sm px-2 py-1 hover:bg-accent/50 rounded">
              <span>{row.icon}</span>
              <span className="truncate underline-offset-2 hover:underline">{row.title || "Untitled"}</span>
            </button>
          ) : (
            <PropertyCell db={db} prop={p} row={row} />
          )}
        </div>
      ))}
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
