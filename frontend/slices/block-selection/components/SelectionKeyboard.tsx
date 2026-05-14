import { useEffect } from "react";
import type { Block } from "@/shared/types/domain";
import { useStore } from "@/shared/lib/store";
import { uid } from "@/shared/lib/uid";
import { useBlockSelection } from "./BlockSelectionProvider";
import { moveTopLevelGroup } from "../lib/multiMove";

interface Props {
  pageId: string;
}

const CLIPBOARD_MIME = "application/x-notion-clone-blocks";

/** Recursively regenerate ids on a block subtree so a paste doesn't collide
 * with the source. */
function regenIds(b: Block): Block {
  const next: Block = { ...b, id: uid() };
  if (b.children) next.children = b.children.map(regenIds);
  if (b.columns) next.columns = b.columns.map((col) => col.map(regenIds));
  return next;
}

function blocksToPlainText(blocks: Block[]): string {
  return blocks.map((b) => b.text || "").join("\n");
}

/** Document-level keyboard + click handlers driving the active selection.
 *
 * - Esc / click outside the selection UI / click in editable text → clear
 * - Backspace / Delete (when not typing) → batch delete
 * - ⌘/Ctrl + C / X / V → copy / cut / paste blocks (custom MIME for fidelity,
 *   plain-text fallback for external apps)
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

    const onCopy = (e: ClipboardEvent) => {
      // If user is typing in editable text, let native copy work for the caret.
      if (isEditable(document.activeElement)) return;
      const page = getPage(pageId);
      if (!page) return;
      const blocks = page.blocks.filter((b) => state.ids.has(b.id));
      if (blocks.length === 0) return;
      e.preventDefault();
      const json = JSON.stringify({ __type: "notion-clone-blocks", blocks });
      e.clipboardData?.setData(CLIPBOARD_MIME, json);
      e.clipboardData?.setData("text/plain", blocksToPlainText(blocks));
    };

    const onCut = (e: ClipboardEvent) => {
      if (isEditable(document.activeElement)) return;
      const page = getPage(pageId);
      if (!page) return;
      const blocks = page.blocks.filter((b) => state.ids.has(b.id));
      if (blocks.length === 0) return;
      e.preventDefault();
      const json = JSON.stringify({ __type: "notion-clone-blocks", blocks });
      e.clipboardData?.setData(CLIPBOARD_MIME, json);
      e.clipboardData?.setData("text/plain", blocksToPlainText(blocks));
      ids.forEach((id) => deleteBlock(pageId, id));
      clear();
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCut);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCut);
    };
  }, [count, state.ids, clear, deleteBlock, duplicateBlock, getPage, updatePage, pageId]);

  // Paste handler — always active (user can paste blocks even with no current selection).
  useEffect(() => {
    const isEditable = (el: EventTarget | null): boolean => {
      const t = el as HTMLElement | null;
      if (!t) return false;
      if (t.isContentEditable) return true;
      const tag = t.tagName;
      return tag === "INPUT" || tag === "TEXTAREA";
    };

    const onPaste = (e: ClipboardEvent) => {
      if (isEditable(document.activeElement)) return; // let native paste own the caret
      const json = e.clipboardData?.getData(CLIPBOARD_MIME);
      if (!json) return;
      e.preventDefault();
      try {
        const data = JSON.parse(json);
        if (data?.__type !== "notion-clone-blocks" || !Array.isArray(data.blocks)) return;
        const fresh = (data.blocks as Block[]).map(regenIds);
        const page = getPage(pageId);
        if (!page) return;
        // Insert after the last currently-selected block; else append.
        const selSet = state.ids;
        let insertIdx = page.blocks.length;
        if (selSet.size > 0) {
          const lastSelectedIdx = page.blocks
            .map((b, i) => (selSet.has(b.id) ? i : -1))
            .filter((i) => i >= 0)
            .pop();
          if (lastSelectedIdx != null) insertIdx = lastSelectedIdx + 1;
        }
        const next = [
          ...page.blocks.slice(0, insertIdx),
          ...fresh,
          ...page.blocks.slice(insertIdx),
        ];
        updatePage(pageId, { blocks: next });
      } catch {
        // Malformed payload — just skip.
      }
    };

    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [getPage, updatePage, pageId, state.ids]);

  return null;
}
