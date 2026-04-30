import { Plus } from "lucide-react";

interface Props {
  onAdd: () => void;
}

export function AddRowFooter({ onAdd }: Props) {
  return (
    <button
      type="button"
      onClick={onAdd}
      className="flex w-full items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:bg-accent border-t border-border transition"
    >
      <Plus className="h-3 w-3" /> New row
    </button>
  );
}
