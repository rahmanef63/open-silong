import { useRef, useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import type { MediaKind } from "./useUpload";

interface Props {
  kind: MediaKind;
  uploading: boolean;
  onFile: (f: File) => void;
  onUrl: (url: string) => void;
}

const ACCEPT: Record<MediaKind, string> = {
  audio: "audio/*",
  video: "video/*",
};

const LABEL: Record<MediaKind, string> = {
  audio: "audio file",
  video: "video file",
};

/** Generic file-or-URL dropzone for audio + video. Mirrors image's
 *  `UploadDropzone` shape — drop / click-upload / paste-URL. */
export function MediaDropzone({ kind, uploading, onFile, onUrl }: Props) {
  const [urlInput, setUrlInput] = useState("");
  const [dropTarget, setDropTarget] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDropTarget(true); }}
      onDragLeave={() => setDropTarget(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDropTarget(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onFile(f);
      }}
      className={cn(
        "rounded-md border border-dashed p-4 text-center transition",
        dropTarget ? "border-brand bg-brand/5" : "border-border",
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT[kind]}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
      <div className="mb-2 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        {uploading ? (
          <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…</>
        ) : (
          <>Drop a {LABEL[kind]} here, paste a URL, or
            <Button
              variant="link"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex h-auto items-center gap-1 p-0 text-sm font-normal text-muted-foreground underline-offset-2 hover:underline [&_svg]:size-3"
            >
              <Upload className="h-3 w-3" /> upload
            </Button>
          </>
        )}
      </div>
      <form
        onSubmit={(e) => { e.preventDefault(); if (urlInput.trim()) onUrl(urlInput.trim()); }}
        className="flex gap-2 max-w-sm mx-auto"
      >
        <input
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          placeholder="https://…"
          disabled={uploading}
          className="flex-1 rounded-md border border-border bg-transparent px-3 py-1.5 text-sm outline-none focus:ring-2 ring-brand/30 disabled:opacity-60"
        />
        <Button
          type="submit"
          disabled={uploading || !urlInput.trim()}
          className="h-auto rounded-md bg-foreground px-3 py-1.5 text-sm text-background hover:bg-foreground/90"
        >
          Embed
        </Button>
      </form>
    </div>
  );
}
