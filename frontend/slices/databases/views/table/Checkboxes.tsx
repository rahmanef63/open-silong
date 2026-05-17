import { Check, Minus } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useRowSelection } from "../../row-selection";

export function HeaderCheckboxGutter({ rowIds }: { rowIds: string[] }) {
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
      {/* shadcn Button skipped: role="checkbox" listbox semantics — shadcn Button erases role context */}
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

export function RowCheckbox({ rowId }: { rowId: string }) {
  const sel = useRowSelection();
  const checked = sel.isSelected(rowId);
  const onClick = (e: React.MouseEvent) => { e.stopPropagation(); sel.toggle(rowId); };
  return (
    // shadcn Button skipped: role="checkbox" listbox semantics — shadcn Button erases role context
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
