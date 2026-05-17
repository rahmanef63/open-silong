import { Lock, Pencil, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useStore } from "@/shared/lib/store";
import { useRowSelection } from "./RowSelectionProvider";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { Separator } from "@/shared/ui/separator";
import { Button } from "@/shared/ui/button";
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
  const { deleteRow, getDatabase, setRowValue, pages } = useStore();
  const db = getDatabase(databaseId);
  const [editOpen, setEditOpen] = useState(false);
  const [editProp, setEditProp] = useState<Property | null>(null);
  const [editValue, setEditValue] = useState<PropertyValue>(null);

  const lockedSet = useMemo(() => {
    const s = new Set<string>();
    for (const p of pages) if (p.locked) s.add(p.id);
    return s;
  }, [pages]);

  if (count === 0 || !db) return null;

  const ids = [...state.ids];
  const editableIds = ids.filter((id) => !lockedSet.has(id));
  const lockedCount = ids.length - editableIds.length;
  const editableProps = db.properties.filter(isFormableProperty);

  const onDelete = () => {
    editableIds.forEach((id) => deleteRow(databaseId, id));
    clear();
  };

  const onApply = () => {
    if (!editProp) return;
    editableIds.forEach((id) => setRowValue(databaseId, id, editProp.id, editValue));
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
      {lockedCount > 0 && (
        <span
          title={`${lockedCount} row${lockedCount === 1 ? "" : "s"} locked — will be skipped`}
          className="flex items-center gap-1 px-2 text-[11px] text-amber-600 dark:text-amber-400"
        >
          <Lock className="h-3 w-3" /> {lockedCount} locked
        </span>
      )}
      <Separator orientation="vertical" className="h-5" />
      <Popover open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (!o) { setEditProp(null); setEditValue(null); } }}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            title="Edit property across selection"
            className="h-auto gap-1 rounded px-2 py-1 text-xs font-normal [&_svg]:size-3.5"
          >
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
        </PopoverTrigger>
        <PopoverContent align="center" side="top" className="w-72 p-2">
          {!editProp ? (
            <div className="flex flex-col">
              <div className="px-2 py-1 text-[11px] font-medium text-muted-foreground">Set property…</div>
              <div className="max-h-64 overflow-y-auto">
                {editableProps.map((p) => (
                  <Button
                    key={p.id}
                    variant="ghost"
                    onClick={() => {
                      setEditProp(p);
                      setEditValue(p.type === "checkbox" ? false : p.type === "multi_select" ? [] : null);
                    }}
                    className="w-full h-auto text-left justify-start rounded px-2 py-1.5 text-xs font-normal"
                  >
                    {p.name}
                    <span className="ml-2 text-[10px] text-muted-foreground">{p.type}</span>
                  </Button>
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
                <Button
                  variant="ghost"
                  onClick={() => { setEditProp(null); setEditValue(null); }}
                  className="h-auto rounded px-2 py-1 text-xs font-normal text-muted-foreground"
                >
                  Back
                </Button>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    onClick={() => { editableIds.forEach((id) => setRowValue(databaseId, id, editProp.id, null)); setEditOpen(false); setEditProp(null); }}
                    className="h-auto rounded px-2 py-1 text-xs font-normal text-muted-foreground"
                  >
                    Clear
                  </Button>
                  <Button
                    onClick={onApply}
                    className="h-auto rounded bg-brand px-2 py-1 text-xs text-brand-foreground hover:bg-brand/90"
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>
      <Button
        variant="ghost"
        onClick={onDelete}
        title="Delete (Del/Backspace)"
        className="h-auto gap-1 rounded px-2 py-1 text-xs font-normal text-destructive hover:bg-destructive/10 hover:text-destructive [&_svg]:size-3.5"
      >
        <Trash2 className="h-3.5 w-3.5" /> Delete
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={clear}
        aria-label="Clear (Esc)"
        title="Clear (Esc)"
        className="ml-1 h-7 w-7 rounded text-muted-foreground [&_svg]:size-3.5"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
