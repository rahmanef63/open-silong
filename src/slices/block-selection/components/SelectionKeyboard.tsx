import { useEffect } from "react";
import { useStore } from "@/shared/lib/store";
import { useBlockSelection } from "./BlockSelectionProvider";
import { moveTopLevelGroup } from "../lib/multiMove";

interface Props {
  pageId: string;
}

/** Document-level keyboard + click handlers driving the active selection.
 *
 * - Esc / click outside the selection UI / click in editable text → clear
 * - Backspace / Delete (when not typing) → batch delete
 * - ⌘/Ctrl + D → batch duplicate
 * - ⌘/Ctrl + Shift + ↑ / ↓ → move selected group up / down (top-level only)
 */
export function SelectionKeyboard({ pageId }: Props) {
  const { state, count, clear } = useBlockSelection();
  const { deleteBlock, duplicateBlock, getPage, updatePage } = useStore();

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

      // Move selected group up/down — works regardless of focus.
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.shiftKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
        const page = getPage(pageId);
        if (!page) return;
        e.preventDefault();
        const dir: -1 | 1 = e.key === "ArrowUp" ? -1 : 1;
        const next = moveTopLevelGroup(page.blocks, ids, dir);
        if (next !== page.blocks) updatePage(pageId, { blocks: next });
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
      if (meta && e.key.toLowerCase() === "d") {
        e.preventDefault();
        ids.forEach((id) => duplicateBlock(pageId, id));
        clear();
        return;
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement;
      // Selection UI itself never clears.
      if (t.closest("[data-block-selection-toolbar]")) return;
      if (t.closest("[data-row-selection-toolbar]")) return;
      if (t.closest("[data-block-select-button]")) return;
      if (t.closest("[data-radix-popper-content-wrapper]")) return;
      if (t.closest("[data-radix-portal]")) return;
      // Grip click is drag/menu; modifier-click on grip is provider's job.
      if (t.closest("[data-block-grip]")) return;
      // Modifier held: marquee may be starting in additive mode — leave it.
      if (e.shiftKey || e.metaKey || e.ctrlKey) return;
      // Otherwise this is "click outside the active selection" → clear.
      clear();
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [count, state.ids, clear, deleteBlock, duplicateBlock, getPage, updatePage, pageId]);

  return null;
}
