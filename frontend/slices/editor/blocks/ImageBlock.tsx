import { useRef, useState } from "react";
import Image from "next/image";
import type { Block } from "@/shared/types/domain";
import { cn } from "@/shared/lib/utils";
import { useImageUpload } from "./image/useUpload";
import { UploadDropzone } from "./image/UploadDropzone";
import { ImageToolbar } from "./image/Toolbar";

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

export function ImageBlock({ block, onUpdate }: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const { uploading, onUploadFile } = useImageUpload((url) => onUpdate({ url }));

  if (!block.url) {
    return (
      <UploadDropzone
        uploading={uploading}
        onFile={onUploadFile}
        onUrl={(url) => onUpdate({ url })}
      />
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
      <ImageToolbar
        align={align}
        onAlign={(v) => onUpdate({ align: v })}
        onChange={() => onUpdate({ url: undefined })}
      />
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
