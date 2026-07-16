import type { KeyboardEvent } from "react";
import type { Block, BlockType } from "@/shared/types/domain";
import { decorateInPlace } from "../lib/inlineDecorator";
import { getCaretOffset, setCaretAtOffset } from "../lib/inline-decorator/caret";
import { readEditableSource } from "../lib/inline-decorator/readSource";
import { mentionDeleteRange } from "./mentionDelete";
import { DECORATE_TYPES } from "./decorateTypes";

interface History {
  undo: (cur: string) => string | null;
  redo: (cur: string) => string | null;
}

interface Deps {
  pageId: string;
  block: Block;
  index: number;
  total: number;
  slashOpen: boolean;
  history: History;
  setAskOpen: (o: boolean) => void;
  convertTo: (t: BlockType) => void;
  duplicateBlock: (pageId: string, blockId: string) => Promise<string>;
  addBlock: (pageId: string, after: number, type?: BlockType, init?: Partial<Block>) => Promise<string | undefined>;
  deleteBlock: (pageId: string, blockId: string) => void;
  setBlockType: (pageId: string, blockId: string, type: BlockType) => void;
  updateBlock: (pageId: string, blockId: string, patch: Partial<Block>) => void;
  focusByOffset: (blockId: string, delta: number) => void;
}

/** Apply undo/redo result: write into DOM + decorate + persist. */
function applyHistoryText(el: HTMLElement, block: Block, txt: string, deps: Deps) {
  el.innerText = txt;
  if (DECORATE_TYPES.has(block.type)) decorateInPlace(el, txt);
  deps.updateBlock(deps.pageId, block.id, { text: txt });
}

export async function handleBlockKeyDown(e: KeyboardEvent<HTMLElement>, deps: Deps) {
  const { block, pageId, index, total, slashOpen, history, setAskOpen, convertTo, duplicateBlock, addBlock, deleteBlock, setBlockType, focusByOffset } = deps;
  const meta = e.metaKey || e.ctrlKey;
  const el = e.currentTarget as HTMLElement;

  if (slashOpen && ["ArrowDown", "ArrowUp", "Enter", "Escape"].includes(e.key)) return;

  // ----- shortcuts -----
  if (meta && e.key.toLowerCase() === "j") {
    e.preventDefault();
    setAskOpen(true);
    return;
  }
  if (meta && e.altKey && (e.key === "1" || e.key === "2" || e.key === "3")) {
    e.preventDefault();
    convertTo(("h" + e.key) as BlockType);
    return;
  }
  if (meta && e.shiftKey && e.key === "7") { e.preventDefault(); convertTo("todo"); return; }
  if (meta && e.shiftKey && e.key === "8") { e.preventDefault(); convertTo("bullet"); return; }
  if (meta && e.key.toLowerCase() === "d") {
    e.preventDefault();
    duplicateBlock(pageId, block.id).then((newId) => {
      if (newId) setTimeout(() => document.querySelector<HTMLElement>(`[data-block-id="${newId}"]`)?.focus(), 0);
    });
    return;
  }
  if (meta && e.shiftKey && e.key.toLowerCase() === "z") {
    e.preventDefault();
    const txt = history.redo(el.innerText);
    if (txt !== null) applyHistoryText(el, block, txt, deps);
    return;
  }
  if (meta && e.key.toLowerCase() === "y") {
    e.preventDefault();
    const txt = history.redo(el.innerText);
    if (txt !== null) applyHistoryText(el, block, txt, deps);
    return;
  }
  if (meta && e.key.toLowerCase() === "z") {
    e.preventDefault();
    const txt = history.undo(el.innerText);
    if (txt !== null) applyHistoryText(el, block, txt, deps);
    return;
  }

  // ----- indent / outdent lists -----
  if (e.key === "Tab" && (block.type === "bullet" || block.type === "numbered" || block.type === "todo")) {
    e.preventDefault();
    const cur = block.indent ?? 0;
    const next = e.shiftKey ? Math.max(0, cur - 1) : Math.min(3, cur + 1);
    if (next !== cur) deps.updateBlock(pageId, block.id, { indent: next });
    return;
  }

  // ----- editing flow -----
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    // Notion-canonical: Enter on an empty list item exits the list
    // (converts current block to paragraph) instead of stacking
    // another empty list item.
    if (
      (block.type === "bullet" || block.type === "numbered" || block.type === "todo") &&
      el.innerText === ""
    ) {
      setBlockType(pageId, block.id, "paragraph");
      // The list types render <div flex><span dot/><div editable/></div>
      // while paragraph renders <p editable>. Tag change → React
      // unmounts the old contentEditable → focus is lost, so subsequent
      // keystrokes (including "/") go to <body> instead of the new
      // paragraph. Restore focus once React commits the new element.
      const blockId = block.id;
      setTimeout(() => document.querySelector<HTMLElement>(`[data-block-id="${blockId}"]`)?.focus(), 0);
      return;
    }
    const next: BlockType =
      block.type === "todo" ? "todo" :
      block.type === "bullet" || block.type === "numbered" ? block.type :
      "paragraph";
    // Inherit layoutGroup/Col + indent so Enter at end of an indented
    // list item or column-bound block stays in its visual group.
    const init: Partial<Block> = {};
    if (block.layoutGroup != null) {
      init.layoutGroup = block.layoutGroup;
      init.layoutCol = block.layoutCol;
    }
    if (block.indent != null && (next === "bullet" || next === "numbered" || next === "todo")) {
      init.indent = block.indent;
    }
    const newId = await addBlock(pageId, index, next, Object.keys(init).length ? init : undefined);
    setTimeout(() => document.querySelector<HTMLElement>(`[data-block-id="${newId}"]`)?.focus(), 0);
    return;
  }
  // Atomic mention delete: Backspace right after a mention chip removes the
  // whole `[label](url)` source in one keystroke instead of nibbling the
  // hidden bracket chars one at a time.
  if (e.key === "Backspace" && !meta && DECORATE_TYPES.has(block.type)) {
    const sel = window.getSelection();
    if (sel && sel.isCollapsed && el.innerText !== "") {
      // Clean read: when the deleted mention is the last thing in the block,
      // Chromium's filler <br> adds a trailing "\n" to innerText; without
      // stripping it the atomic delete would leave a stray empty line behind.
      const src = readEditableSource(el);
      const del = mentionDeleteRange(src, getCaretOffset(el));
      if (del) {
        e.preventDefault();
        const txt = src.slice(0, del[0]) + src.slice(del[1]);
        el.innerText = txt;
        if (DECORATE_TYPES.has(block.type)) decorateInPlace(el, txt);
        deps.updateBlock(pageId, block.id, { text: txt });
        setCaretAtOffset(el, del[0]);
        return;
      }
    }
  }
  if (e.key === "Backspace" && el.innerText === "") {
    e.preventDefault();
    // Notion-canonical: backspace on an EMPTY text-shape block
    // (heading, bullet, numbered, todo, quote, callout) first exits
    // the block-type — converts to paragraph + restores focus. A
    // second backspace from the empty paragraph then triggers the
    // delete branch below. This matches the user's mental model:
    // "list items are just text with a visual prefix; deleting them
    // empties text first, then drops the prefix, then deletes."
    if (block.type !== "paragraph" && DECORATE_TYPES.has(block.type)) {
      setBlockType(pageId, block.id, "paragraph");
      const blockId = block.id;
      setTimeout(() => document.querySelector<HTMLElement>(`[data-block-id="${blockId}"]`)?.focus(), 0);
      return;
    }
    if (total > 1) {
      const blockId = block.id;
      deleteBlock(pageId, blockId);
      setTimeout(() => focusByOffset(blockId, -1), 0);
    }
    return;
  }
  if (e.key === "Tab") {
    e.preventDefault();
    const cur = parseInt(el.dataset.indent ?? "0", 10);
    const newIndent = e.shiftKey ? Math.max(0, cur - 1) : Math.min(4, cur + 1);
    el.dataset.indent = String(newIndent);
    el.style.marginLeft = `${newIndent * 20}px`;
    return;
  }
  if (e.key === "ArrowDown" && (window.getSelection()?.focusOffset ?? 0) === el.innerText.length) {
    focusByOffset(block.id, 1);
  } else if (e.key === "ArrowUp" && (window.getSelection()?.focusOffset ?? 0) === 0) {
    focusByOffset(block.id, -1);
  }
}
