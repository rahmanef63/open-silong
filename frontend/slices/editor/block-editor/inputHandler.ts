import type { FormEvent, MutableRefObject } from "react";
import type { Block, BlockType } from "@/shared/types/domain";
import { MARKDOWN_TRIGGERS } from "../lib/markdownTriggers";
import { decorateInPlace } from "../lib/inlineDecorator";
import { DECORATE_TYPES } from "./decorateTypes";

interface History { record: (txt: string) => void }

interface Deps {
  pageId: string;
  block: Block;
  history: History;
  composingRef: MutableRefObject<boolean>;
  setBlockType: (pageId: string, blockId: string, type: BlockType) => void;
  updateBlock: (pageId: string, blockId: string, patch: Partial<Block>) => void;
  setSlashOpen: (o: boolean) => void;
  setSlashQuery: (q: string) => void;
}

export function handleBlockInput(e: FormEvent<HTMLElement>, deps: Deps) {
  const { pageId, block, history, composingRef, setBlockType, updateBlock, setSlashOpen, setSlashQuery } = deps;
  const el = e.currentTarget as HTMLElement;
  const text = el.innerText;
  history.record(text);

  if (block.type === "paragraph") {
    const trigger = MARKDOWN_TRIGGERS[text];
    if (trigger) {
      el.innerText = "";
      setBlockType(pageId, block.id, trigger.type);
      updateBlock(pageId, block.id, { text: "", ...(trigger.patch ?? {}) });
      setSlashOpen(false);
      return;
    }
  }

  updateBlock(pageId, block.id, { text });

  const isSlash = text === "/" || (text.startsWith("/") && !text.includes("\n"));
  if (isSlash) {
    setSlashOpen(true);
    setSlashQuery(text.slice(1));
  } else {
    setSlashOpen(false);
  }

  if (DECORATE_TYPES.has(block.type) && !composingRef.current && !isSlash) {
    const isHeading = block.type === "h1" || block.type === "h2" || block.type === "h3"
      || block.type === "h4" || block.type === "h5" || block.type === "h6";
    decorateInPlace(el, text, isHeading ? { hideMarkers: true } : undefined);
  }
}
