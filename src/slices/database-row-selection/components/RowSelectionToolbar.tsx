import { Trash2, X } from "lucide-react";
import { useStore } from "@/shared/lib/store";
import { useRowSelection } from "./RowSelectionProvider";

interface Props {
  databaseId: string;
}

export function RowSelectionToolbar({ databaseId }: Props) {
  const { state, count, clear } = useRowSelection();
  const { deleteRow } = useStore();

  if (count === 0) return null;

  const ids = [...state.ids];

  const onDelete = () => {
    ids.forEach((id) => deleteRow(databaseId, id));
    clear();
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
