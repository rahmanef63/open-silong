import type { FormEvent, KeyboardEvent } from "react";
import type { Block, BlockType } from "@/shared/types/domain";
import { uid } from "@/shared/lib/uid";
import { MARKDOWN_TRIGGERS } from "../../lib/markdownTriggers";
import { DECORATE_TYPES } from "../../block-editor/decorateTypes";
import { buildTurnIntoPatch } from "../../lib/turnInto";

const DEBUG = () =>
  typeof window !== "undefined" && window.location.search.includes("debug=blocks");

interface InputDeps {
  block: Block;
  onUpdate: (patch: Partial<Block>) => void;
  setSlashOpen: (o: boolean) => void;
  setSlashQuery: (q: string) => void;
}

export function handleNestedInput(e: FormEvent<HTMLElement>, deps: InputDeps) {
  const { block, onUpdate, setSlashOpen, setSlashQuery } = deps;
  const el = e.currentTarget as HTMLElement;
  const text = el.innerText;
  if (block.type === "paragraph") {
    const trigger = MARKDOWN_TRIGGERS[text];
    if (trigger) {
      el.innerText = "";
      onUpdate({ type: trigger.type, text: "", ...(trigger.patch ?? {}) });
      setSlashOpen(false);
      return;
    }
  }
  onUpdate({ text });
  if (text === "/" || (text.startsWith("/") && !text.includes("\n"))) {
    setSlashOpen(true);
    setSlashQuery(text.slice(1));
  } else {
    setSlashOpen(false);
  }
}

export function runNestedSlashSelect(
  type: BlockType,
  block: Block,
  onUpdate: (patch: Partial<Block>) => void,
) {
  // Use the shared turn-into builder for normal types; columns get
  // their inline-children initialiser tacked on (nested columns still
  // store the legacy block.columns shape; top-level uses the layout
  // primitive instead).
  const patch = buildTurnIntoPatch(type);
  if (type === "columns2") {
    patch.columns = [
      [{ id: uid(), type: "paragraph", text: "" }],
      [{ id: uid(), type: "paragraph", text: "" }],
    ];
  }
  if (type === "columns3") {
    patch.columns = [
      [{ id: uid(), type: "paragraph", text: "" }],
      [{ id: uid(), type: "paragraph", text: "" }],
      [{ id: uid(), type: "paragraph", text: "" }],
    ];
  }
  if (DEBUG()) {
    // eslint-disable-next-line no-console
    console.log("[turnInto:slash]", { blockId: block.id, from: block.type, to: type, patch });
  }
  onUpdate(patch);
  setTimeout(() => {
    const el = document.querySelector<HTMLElement>(`[data-block-id="${block.id}"]`);
    if (DEBUG()) {
      // eslint-disable-next-line no-console
      console.log("[turnInto:focus]", { blockId: block.id, foundEl: !!el, activeBefore: document.activeElement?.tagName });
    }
    el?.focus();
    if (el) el.innerText = "";
  }, 0);
}

interface KeyDeps {
  block: Block;
  slashOpen: boolean;
  onAddAfter: (type?: BlockType) => void;
  onDelete: () => void;
  onFocusNext?: () => void;
  onFocusPrev?: () => void;
}

interface KeyDepsWithUpdate extends KeyDeps {
  onUpdate?: (patch: Partial<Block>) => void;
}

export function handleNestedKeyDown(e: KeyboardEvent<HTMLElement>, deps: KeyDepsWithUpdate) {
  const { block, slashOpen, onAddAfter, onDelete, onFocusNext, onFocusPrev, onUpdate } = deps;
  const el = e.currentTarget as HTMLElement;
  if (slashOpen && ["ArrowDown", "ArrowUp", "Enter", "Escape"].includes(e.key)) return;
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    // Notion-canonical: Enter on an empty list item exits the list
    // by converting the current block to a paragraph.
    if (
      onUpdate &&
      (block.type === "bullet" || block.type === "numbered" || block.type === "todo") &&
      el.innerText === ""
    ) {
      onUpdate({ type: "paragraph" });
      // List → paragraph swaps the DOM tag (flex shell w/ dot → <p>),
      // which unmounts the contentEditable and drops focus. Re-focus
      // once React commits the new element so the user can keep typing
      // (especially "/" for the slash menu).
      const blockId = block.id;
      setTimeout(() => document.querySelector<HTMLElement>(`[data-block-id="${blockId}"]`)?.focus(), 0);
      return;
    }
    const next: BlockType =
      block.type === "todo" ? "todo" :
      block.type === "bullet" ? "bullet" :
      block.type === "numbered" ? "numbered" : "paragraph";
    onAddAfter(next);
    return;
  }
  if (e.key === "Backspace" && el.innerText === "") {
    e.preventDefault();
    // Notion-canonical: backspace on empty text-shape converts it to
    // paragraph first; only the next backspace from empty paragraph
    // actually removes the block.
    if (
      onUpdate &&
      block.type !== "paragraph" &&
      DECORATE_TYPES.has(block.type)
    ) {
      onUpdate({ type: "paragraph" });
      const blockId = block.id;
      setTimeout(() => document.querySelector<HTMLElement>(`[data-block-id="${blockId}"]`)?.focus(), 0);
      return;
    }
    onDelete();
    onFocusPrev?.();
    return;
  }
  if (e.key === "ArrowDown") onFocusNext?.();
  if (e.key === "ArrowUp") onFocusPrev?.();
}
