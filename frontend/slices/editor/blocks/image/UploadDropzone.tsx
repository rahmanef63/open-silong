import { useRef, useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";

interface Props {
  uploading: boolean;
  onFile: (f: File) => void;
  onUrl: (url: string) => void;
}

export function UploadDropzone({ uploading, onFile, onUrl }: Props) {
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
      onPaste={(e) => {
        for (const item of e.clipboardData.items) {
          if (item.kind === "file" && item.type.startsWith("image/")) {
            const f = item.getAsFile();
            if (f) {
              e.preventDefault();
              onFile(f);
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
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
      <div className="mb-2 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        {uploading ? (
          <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…</>
        ) : (
          <>Drop an image here, paste a URL, or
            <Button
              type="button"
              variant="link"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex h-auto p-0 items-center gap-1 underline-offset-2 text-sm font-normal text-muted-foreground hover:text-foreground [&_svg]:size-3"
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
          className="h-auto rounded-md bg-foreground text-background px-3 py-1.5 text-sm hover:bg-foreground/90"
        >
          Embed
        </Button>
      </form>
    </div>
  );
}
