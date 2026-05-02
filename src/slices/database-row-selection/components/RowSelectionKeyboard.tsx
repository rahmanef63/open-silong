import { useEffect } from "react";
import { useStore } from "@/shared/lib/store";
import { useRowSelection } from "./RowSelectionProvider";

interface Props {
  databaseId: string;
}

export function RowSelectionKeyboard({ databaseId }: Props) {
  const { state, count, clear } = useRowSelection();
  const { deleteRow } = useStore();

  useEffect(() => {
    if (count === 0) return;
    const ids = [...state.ids];

    const isEditable = (el: EventTarget | null): boolean => {
      const t = el as HTMLElement | null;
      if (!t) return false;
      if (t.isContentEditable) return true;
      const tag = t.tagName;
      return tag === "INPUT" || tag === "TEXTAREA";
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        clear();
        return;
      }
      if (isEditable(e.target)) return;
      if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        ids.forEach((id) => deleteRow(databaseId, id));
        clear();
        return;
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("[data-row-selection-toolbar]")) return;
      if (t.closest("[data-radix-popper-content-wrapper]")) return;
      // Click in editable text → user wants caret → clear.
      if (isEditable(t) || t.closest("[contenteditable='true']")) clear();
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [count, state.ids, clear, deleteRow, databaseId]);

  return null;
}
