import { useRef, useState } from "react";
import Image from "next/image";
import { useMutation, useConvex } from "convex/react";
import { AlignLeft, AlignCenter, AlignRight, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Block } from "@/shared/types/domain";
import { api } from "@convex/_generated/api";
import { reportError } from "@/shared/lib/error";
import { cn } from "@/shared/lib/utils";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB

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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dropTarget, setDropTarget] = useState(false);
  const generateUploadUrl = useMutation(api["features/files/mutations"].generateUploadUrl);
  const confirmUpload = useMutation(api["features/files/mutations"].confirmUpload);
  const convex = useConvex();

  const onUploadFile = async (file: File) => {
    if (uploading) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Pick an image file");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Image too large (max 10 MB)");
      return;
    }
    setUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
      const { storageId } = (await res.json()) as { storageId: string };
      await confirmUpload({ storageId });
      const url = await convex.query(api["features/files/queries"].getUrl, { storageId });
      if (!url) throw new Error("Storage URL not available");
      onUpdate({ url });
      toast.success("Image uploaded");
    } catch (err) {
      const safe = reportError("ImageBlock.upload", err);
      toast.error(safe.message);
    } finally {
      setUploading(false);
    }
  };

  if (!block.url) {
    return (
      <div
        onDragOver={(e) => { e.preventDefault(); setDropTarget(true); }}
        onDragLeave={() => setDropTarget(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDropTarget(false);
          const f = e.dataTransfer.files?.[0];
          if (f) onUploadFile(f);
        }}
        onPaste={(e) => {
          for (const item of e.clipboardData.items) {
            if (item.kind === "file" && item.type.startsWith("image/")) {
              const f = item.getAsFile();
              if (f) {
                e.preventDefault();
                onUploadFile(f);
                return;
              }
            }
          }
        }}
        className={cn(
          "rounded-md border border-dashed p-4 text-center transition",
          dropTarget ? "border-brand bg-brand/5" : "border-border",
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUploadFile(f);
            e.target.value = "";
          }}
        />
        <div className="mb-2 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          {uploading ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…</>
          ) : (
            <>Drop an image here, paste a URL, or
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1 underline-offset-2 hover:underline"
              >
                <Upload className="h-3 w-3" /> upload
              </button>
            </>
          )}
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); if (urlInput.trim()) onUpdate({ url: urlInput.trim() }); }}
          className="flex gap-2 max-w-sm mx-auto"
        >
          <input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://…"
            disabled={uploading}
            className="flex-1 rounded-md border border-border bg-transparent px-3 py-1.5 text-sm outline-none focus:ring-2 ring-brand/30 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={uploading || !urlInput.trim()}
            className="rounded-md bg-foreground text-background px-3 py-1.5 text-sm disabled:opacity-60"
          >
            Embed
          </button>
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
