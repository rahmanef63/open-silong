import { useState } from "react";
import type { Block } from "@/lib/types";

interface Props {
  block: Block;
  onUpdate: (patch: Partial<Block>) => void;
}

export function ImageBlock({ block, onUpdate }: Props) {
  const [urlInput, setUrlInput] = useState(block.url ?? "");

  if (!block.url) {
    return (
      <div className="rounded-md border border-dashed border-border p-4 text-center">
        <div className="text-sm text-muted-foreground mb-2">Paste an image URL</div>
        <form
          onSubmit={(e) => { e.preventDefault(); if (urlInput.trim()) onUpdate({ url: urlInput.trim() }); }}
          className="flex gap-2 max-w-sm mx-auto"
        >
          <input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://…"
            className="flex-1 rounded-md border border-border bg-transparent px-3 py-1.5 text-sm outline-none focus:ring-2 ring-brand/30"
          />
          <button type="submit" className="rounded-md bg-foreground text-background px-3 py-1.5 text-sm">Embed</button>
        </form>
      </div>
    );
  }

  return (
    <div className="group/img relative">
      <img
        src={block.url}
        alt={block.caption ?? ""}
        className="max-w-full rounded-md border border-border object-contain"
        onError={(e) => (e.currentTarget.style.opacity = "0.3")}
      />
      <div
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => onUpdate({ caption: (e.currentTarget as HTMLElement).innerText })}
        data-placeholder="Caption"
        className="mt-1 text-sm text-muted-foreground text-center outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/40"
      />
      <button
        onClick={() => onUpdate({ url: undefined })}
        className="absolute top-1 right-1 rounded bg-background/80 border border-border px-1.5 py-0.5 text-xs text-muted-foreground opacity-0 group-hover/img:opacity-100 transition"
      >
        Change
      </button>
    </div>
  );
}
