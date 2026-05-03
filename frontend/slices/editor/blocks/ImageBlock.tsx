import { useRef, useState } from "react";
import Image from "next/image";
import { AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import type { Block } from "@/shared/types/domain";
import { cn } from "@/shared/lib/utils";

interface Props {
  block: Block;
  onUpdate: (patch: Partial<Block>) => void;
}

const MIN_W = 15;
const MAX_W = 100;

const ALIGN_WRAPPER: Record<NonNullable<Block["align"]>, string> = {
  left: "mr-auto",
  center: "mx-auto",
  right: "ml-auto",
};

const ALIGN_OPTIONS: { value: NonNullable<Block["align"]>; Icon: typeof AlignLeft }[] = [
  { value: "left", Icon: AlignLeft },
  { value: "center", Icon: AlignCenter },
  { value: "right", Icon: AlignRight },
];

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
  const align = block.align ?? "center";

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
      className={cn("group/img relative", ALIGN_WRAPPER[align])}
    >
      <Image
        src={block.url}
        alt={block.caption ?? ""}
        width={1600}
        height={1200}
        unoptimized
        sizes="(max-width: 768px) 100vw, 768px"
        className="block w-full h-auto rounded-md border border-border object-contain"
        onError={(e) => (e.currentTarget.style.opacity = "0.3")}
      />
      <div
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => onUpdate({ caption: (e.currentTarget as HTMLElement).innerText })}
        data-placeholder="Caption"
        className="mt-1 text-sm text-muted-foreground text-center outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/40"
      />
      {/* Floating toolbar: align + change */}
      <div className="absolute top-1 right-1 flex items-center gap-1 rounded bg-background/85 border border-border px-1 py-0.5 opacity-0 group-hover/img:opacity-100 transition">
        {ALIGN_OPTIONS.map(({ value, Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => onUpdate({ align: value })}
            aria-label={`Align ${value}`}
            className={cn(
              "h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground transition",
              align === value && "bg-accent text-foreground",
            )}
          >
            <Icon className="h-3 w-3" />
          </button>
        ))}
        <span className="mx-0.5 h-3 w-px bg-border" />
        <button
          type="button"
          onClick={() => onUpdate({ url: undefined })}
          className="rounded px-1 text-[11px] text-muted-foreground hover:text-foreground"
        >
          Change
        </button>
      </div>
      {/* Resize handle on right edge */}
      <div
        onPointerDown={onResizeStart}
        className={cn(
          "absolute top-1/2 -right-1 -translate-y-1/2 h-12 w-1.5 rounded-full bg-foreground/60 cursor-ew-resize transition",
          dragging ? "opacity-100" : "opacity-0 group-hover/img:opacity-100",
        )}
        aria-label="Resize image"
      />
    </div>
  );
}
