import { Pencil, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useStore } from "@/shared/lib/store";
import { useRowSelection } from "./RowSelectionProvider";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import {
  PropertyFormInput,
  FormField,
  isFormableProperty,
} from "@/slices/databases/components/PropertyFormInput";
import type { Property, PropertyValue } from "@/shared/types/domain";

interface Props {
  databaseId: string;
}

export function RowSelectionToolbar({ databaseId }: Props) {
  const { state, count, clear } = useRowSelection();
  const { deleteRow, getDatabase, setRowValue } = useStore();
  const db = getDatabase(databaseId);
  const [editOpen, setEditOpen] = useState(false);
  const [editProp, setEditProp] = useState<Property | null>(null);
  const [editValue, setEditValue] = useState<PropertyValue>(null);

  if (count === 0 || !db) return null;

  const ids = [...state.ids];
  const editableProps = db.properties.filter(isFormableProperty);

  const onDelete = () => {
    ids.forEach((id) => deleteRow(databaseId, id));
    clear();
  };

  const onApply = () => {
    if (!editProp) return;
    ids.forEach((id) => setRowValue(databaseId, id, editProp.id, editValue));
    setEditOpen(false);
    setEditProp(null);
    setEditValue(null);
  };

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div
      data-row-selection-toolbar
      onMouseDown={stop}
      onClick={stop}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-1.5 shadow-lg"
    >
      <span className="px-2 text-xs text-muted-foreground tabular-nums">
        {count} {count === 1 ? "row" : "rows"} selected
      </span>
      <div className="h-5 w-px bg-border" />
      <Popover open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (!o) { setEditProp(null); setEditValue(null); } }}>
        <PopoverTrigger asChild>
          <button
            title="Edit property across selection"
            className="flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-accent"
          >
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
        </PopoverTrigger>
        <PopoverContent align="center" side="top" className="w-72 p-2">
          {!editProp ? (
            <div className="flex flex-col">
              <div className="px-2 py-1 text-[11px] font-medium text-muted-foreground">Set property…</div>
              <div className="max-h-64 overflow-y-auto">
                {editableProps.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setEditProp(p);
                      setEditValue(p.type === "checkbox" ? false : p.type === "multi_select" ? [] : null);
                    }}
                    className="w-full text-left rounded px-2 py-1.5 text-xs hover:bg-accent"
                  >
                    {p.name}
                    <span className="ml-2 text-[10px] text-muted-foreground">{p.type}</span>
                  </button>
                ))}
                {editableProps.length === 0 && (
                  <div className="px-2 py-2 text-xs text-muted-foreground">No editable properties.</div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <FormField label={editProp.name} hint={`Apply to ${count} rows`}>
                <PropertyFormInput prop={editProp} value={editValue} onChange={setEditValue} />
              </FormField>
              <div className="flex justify-between gap-2 pt-1">
                <button
                  onClick={() => { setEditProp(null); setEditValue(null); }}
                  className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
                >
                  Back
                </button>
                <div className="flex gap-1">
                  <button
                    onClick={() => { ids.forEach((id) => setRowValue(databaseId, id, editProp.id, null)); setEditOpen(false); setEditProp(null); }}
                    className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
                  >
                    Clear
                  </button>
                  <button
                    onClick={onApply}
                    className="rounded bg-brand px-2 py-1 text-xs text-brand-foreground hover:bg-brand/90"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>
      <button
        onClick={onDelete}
        title="Delete (Del/Backspace)"
        className="flex items-center gap-1 rounded px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="h-3.5 w-3.5" /> Delete
      </button>
      <button
        onClick={clear}
        aria-label="Clear (Esc)"
        title="Clear (Esc)"
        className="ml-1 flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-accent"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
