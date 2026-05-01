import { useRef, useState } from "react";
import type { Block } from "@/shared/types/domain";

interface Props {
  block: Block;
  onUpdate: (patch: Partial<Block>) => void;
}

const MIN_W = 15;
const MAX_W = 100;

export function ImageBlock({ block, onUpdate }: Props) {
  const [urlInput, setUrlInput] = useState(block.url ?? "");
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);

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

  const widthPct = block.width ?? 100;

  const onResizeStart = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const wrap = wrapRef.current;
    if (!wrap) return;
    const parent = wrap.parentElement;
    if (!parent) return;
    setDragging(true);
    const parentRect = parent.getBoundingClientRect();
    const startX = e.clientX;
    const startW = wrap.getBoundingClientRect().width;

    const onMove = (ev: PointerEvent) => {
      const delta = ev.clientX - startX;
      const nextPx = Math.max(60, Math.min(parentRect.width, startW + delta));
      const pct = Math.round(Math.max(MIN_W, Math.min(MAX_W, (nextPx / parentRect.width) * 100)));
      wrap.style.width = `${pct}%`;
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setDragging(false);
      const final = wrap.style.width;
      const num = parseFloat(final);
      if (Number.isFinite(num)) onUpdate({ width: num });
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return (
    <div
      ref={wrapRef}
      style={{ width: `${widthPct}%` }}
      className="group/img relative"
    >
      <img
        src={block.url}
        alt={block.caption ?? ""}
        className="block w-full rounded-md border border-border object-contain"
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
      {/* Resize handle on right edge */}
      <div
        onPointerDown={onResizeStart}
        className={
          "absolute top-1/2 -right-1 -translate-y-1/2 h-12 w-1.5 rounded-full bg-foreground/60 cursor-ew-resize " +
          (dragging ? "opacity-100" : "opacity-0 group-hover/img:opacity-100") +
          " transition"
        }
        aria-label="Resize image"
      />
    </div>
  );
}
