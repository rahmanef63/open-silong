"use client";

/** <NotionBlock /> — single-block renderer primitive.
 *
 *  Dispatches via the editor's BLOCK_RENDERERS registry. For text-shape
 *  blocks (paragraph/headings/list/quote/callout/code) renders a
 *  minimal contentEditable shell; for specialised types (image/embed/
 *  button/equation/table/divider/toc/audio/video) delegates to the
 *  registered renderer.
 *
 *  Pure props — no store reach-around. Pass `onUpdate` for the block
 *  data, `onRemove` for delete intent.
 */

import { useRef, useEffect } from "react";
import type { Block } from "@/shared/types/domain";
import { getBlockRenderer } from "@/slices/editor/blocks/registry";
import { TOP_LEVEL_PLACEHOLDERS } from "@/slices/editor/blocks/placeholders";
import { cn } from "@/shared/lib/utils";

export interface NotionBlockProps {
  block: Block;
  pageId?: string;
  onUpdate?: (patch: Partial<Block>) => void;
  onRemove?: () => void;
  readOnly?: boolean;
  className?: string;
}

export function NotionBlock({ block, pageId, onUpdate, onRemove, readOnly, className }: NotionBlockProps) {
  const Renderer = getBlockRenderer(block.type);
  const ref = useRef<HTMLDivElement | null>(null);

  // Sync DOM ↔ block.text only when not focused (avoids caret jumps).
  useEffect(() => {
    const el = ref.current;
    if (!el || document.activeElement === el) return;
    if (el.innerText !== (block.text ?? "")) el.innerText = block.text ?? "";
  }, [block.text]);

  // Specialised renderer path (image / embed / button / equation / table /
  // divider / toc / audio / video).
  if (Renderer) {
    return (
      <div className={cn("my-1", className)} data-block-id={block.id}>
        <Renderer
          block={block}
          pageId={pageId}
          onUpdate={(patch) => onUpdate?.(patch)}
          onReplace={(next) => onUpdate?.({ ...next, id: block.id } as Partial<Block>)}
        />
      </div>
    );
  }

  // Text-shape fallback (paragraph / headings / list / quote / callout / code).
  const placeholder = TOP_LEVEL_PLACEHOLDERS[block.type] ?? "";
  return (
    <div
      ref={ref}
      data-block-id={block.id}
      contentEditable={!readOnly}
      suppressContentEditableWarning
      onInput={(e) => onUpdate?.({ text: (e.currentTarget as HTMLElement).innerText })}
      onKeyDown={(e) => {
        if (readOnly) return;
        if (e.key === "Backspace" && (e.currentTarget as HTMLElement).innerText === "") {
          e.preventDefault();
          onRemove?.();
        }
      }}
      data-placeholder={placeholder}
      className={cn(
        "outline-none whitespace-pre-wrap break-words py-1 empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/40",
        block.type === "h1" && "text-3xl font-bold tracking-tight font-serif",
        block.type === "h2" && "text-2xl font-semibold tracking-tight font-serif",
        block.type === "h3" && "text-xl font-semibold tracking-tight",
        block.type === "h4" && "text-lg font-semibold tracking-tight",
        block.type === "quote" && "border-l-4 border-foreground/40 pl-4 italic text-foreground/80",
        block.type === "code" && "rounded bg-muted px-2 py-1 font-mono text-sm",
        block.type === "callout" && "rounded-md border border-brand/20 bg-brand/10 px-3 py-2",
        block.type === "bullet" && "list-disc ml-5",
        block.type === "numbered" && "list-decimal ml-5",
        className,
      )}
    />
  );
}
