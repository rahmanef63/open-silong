"use client";

import { useState, useRef } from "react";
import { Loader2, Upload as UploadIcon } from "lucide-react";
import { toast } from "sonner";
import { useFileUpload } from "@/slices/files";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";
import type { CoverData } from "@/shared/types/domain";

interface Props {
  onPick: (cover: CoverData) => void;
}

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

export function UploadTab({ onPick }: Props) {
  const { upload, uploading } = useFileUpload();
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function pickLocal(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Pick an image file");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Image too large (max 8 MB)");
      return;
    }
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview({ file, url: URL.createObjectURL(file) });
  }

  async function applyUpload() {
    if (!preview) return;
    try {
      const ref = await upload(preview.file);
      onPick({ type: "upload", value: ref, positionY: 50, metadata: { filename: preview.file.name } });
    } catch (e) {
      toast.error(`Upload failed: ${(e as Error).message}`);
    }
  }

  return (
    <div className="space-y-4 p-2">
      <div
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-border/40 bg-card p-8 text-center cursor-pointer transition hover:border-foreground",
          uploading && "pointer-events-none opacity-60",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && pickLocal(e.target.files[0])}
        />
        {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <UploadIcon className="h-6 w-6 text-muted-foreground" />}
        <p className="text-xs text-muted-foreground">Drop an image, or click to choose · max 8 MB</p>
      </div>

      {preview && (
        <div className="space-y-2">
          <div className="overflow-hidden rounded-md border border-border bg-card">
            <img
              src={preview.url}
              alt="preview"
              className="block max-h-48 w-full object-cover"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { URL.revokeObjectURL(preview.url); setPreview(null); }} disabled={uploading}>
              Cancel
            </Button>
            <Button onClick={applyUpload} disabled={uploading}>
              {uploading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
              Set as cover
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
