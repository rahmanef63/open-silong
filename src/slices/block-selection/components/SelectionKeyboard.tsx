import { useEffect } from "react";
import { useStore } from "@/shared/lib/store";
import { useBlockSelection } from "./BlockSelectionProvider";

interface Props {
  pageId: string;
}

/**
 * Document-level keyboard + click handlers for the active selection.
 * - Esc clears
 * - Backspace / Delete deletes selection (when not focused in editable text)
 * - Cmd/Ctrl+D duplicates
 * - Click in any contentEditable clears (user wants to type)
 */
export function SelectionKeyboard({ pageId }: Props) {
  const { state, count, clear } = useBlockSelection();
  const { deleteBlock, duplicateBlock } = useStore();

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
      // Esc always clears.
      if (e.key === "Escape") {
        e.preventDefault();
        clear();
        return;
      }
      // Other shortcuts only when NOT typing in an editable surface.
      if (isEditable(e.target)) return;

      if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        ids.forEach((id) => deleteBlock(pageId, id));
        clear();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        ids.forEach((id) => duplicateBlock(pageId, id));
        clear();
        return;
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      // Selection UI itself never clears.
      if (target.closest("[data-block-selection-toolbar]")) return;
      if (target.closest("[data-block-select-button]")) return;
      if (target.closest("[data-radix-popper-content-wrapper]")) return;
      // Grip click (drag/menu) doesn't auto-clear; the modifier-click path
      // is handled by BlockSelectionProvider.
      if (target.closest("[data-block-grip]")) return;
      // Clicking inside editable text → clear (user wants caret).
      if (isEditable(target) || target.closest("[contenteditable='true']")) {
        clear();
      }
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [count, state.ids, clear, deleteBlock, duplicateBlock, pageId]);

  return null;
}
