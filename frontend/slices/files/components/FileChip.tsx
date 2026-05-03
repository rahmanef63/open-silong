import { File as FileIcon, Download, ExternalLink, X } from "lucide-react";
import { parseFileRef } from "../lib/parse";
import { useFileUrl } from "../hooks/useFileUrl";
import type { FileRef } from "../types";
import { cn } from "@/shared/lib/utils";

interface Props {
  fileRef: FileRef;
  onRemove?: () => void;
}

export function FileChip({ fileRef, onRemove }: Props) {
  const parsed = parseFileRef(fileRef);
  const storageUrl = useFileUrl(parsed.kind === "storage" ? parsed.storageId : null);
  const href = parsed.kind === "url" ? parsed.raw : storageUrl;

  return (
    <div className="group flex items-center gap-2 rounded border border-border bg-muted/40 px-2 py-1.5 text-xs">
      <FileIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          download={parsed.filename}
          className="min-w-0 flex-1 truncate text-brand hover:underline"
        >
          {parsed.filename}
        </a>
      ) : (
        <span className={cn("min-w-0 flex-1 truncate", parsed.kind === "storage" && "text-muted-foreground")}>
          {parsed.filename}
        </span>
      )}
      {href && (
        <a href={href} target="_blank" rel="noopener noreferrer" download={parsed.filename} className="text-muted-foreground hover:text-foreground" aria-label="Download">
          {parsed.kind === "url" ? <ExternalLink className="h-3 w-3" /> : <Download className="h-3 w-3" />}
        </a>
      )}
      {onRemove && (
        <button
          onClick={onRemove}
          aria-label="Remove"
          className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-destructive opacity-0 group-hover:opacity-100"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
