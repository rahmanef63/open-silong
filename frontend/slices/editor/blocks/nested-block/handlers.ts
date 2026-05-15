import type { FormEvent, KeyboardEvent } from "react";
import type { Block, BlockType } from "@/shared/types/domain";
import { uid } from "@/shared/lib/uid";
import { MARKDOWN_TRIGGERS } from "../../lib/markdownTriggers";

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
  const patch: Partial<Block> = { type, text: "" };
  if (type === "toggle") { patch.children = []; patch.collapsed = false; }
  if (type === "synced") { patch.children = []; patch.syncId = uid(); }
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
  onUpdate(patch);
  setTimeout(() => {
    const el = document.querySelector<HTMLElement>(`[data-block-id="${block.id}"]`);
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

export function handleNestedKeyDown(e: KeyboardEvent<HTMLElement>, deps: KeyDeps) {
  const { block, slashOpen, onAddAfter, onDelete, onFocusNext, onFocusPrev } = deps;
  const el = e.currentTarget as HTMLElement;
  if (slashOpen && ["ArrowDown", "ArrowUp", "Enter", "Escape"].includes(e.key)) return;
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    const next: BlockType =
      block.type === "todo" ? "todo" :
      block.type === "bullet" ? "bullet" :
      block.type === "numbered" ? "numbered" : "paragraph";
    onAddAfter(next);
    return;
  }
  if (e.key === "Backspace" && el.innerText === "") {
    e.preventDefault();
    onDelete();
    onFocusPrev?.();
    return;
  }
  if (e.key === "ArrowDown") onFocusNext?.();
  if (e.key === "ArrowUp") onFocusPrev?.();
}
