import { useRef } from "react";
import { Upload } from "lucide-react";
import { useFileUpload } from "../hooks/useFileUpload";
import type { FileRef } from "../types";
import { Button } from "@/shared/ui/button";

interface Props {
  onUploaded: (ref: FileRef) => void;
  multiple?: boolean;
  className?: string;
  label?: string;
}

export function FileUploadButton({ onUploaded, multiple = false, className, label = "Upload" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { upload, uploading } = useFileUpload();

  const onPick = async (files: FileList | null) => {
    if (!files) return;
    for (const f of Array.from(files)) {
      try {
        const ref = await upload(f);
        onUploaded(ref);
      } catch (e) {
        console.error("Upload failed", e);
      }
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple={multiple}
        className="hidden"
        onChange={(e) => onPick(e.target.files)}
      />
      <Button
        variant="ghost"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className={className ?? "h-auto gap-1 p-0 text-xs font-normal text-muted-foreground hover:bg-transparent hover:text-foreground [&_svg]:size-3"}
      >
        <Upload className="h-3 w-3" />
        {uploading ? "Uploading…" : label}
      </Button>
    </>
  );
}
