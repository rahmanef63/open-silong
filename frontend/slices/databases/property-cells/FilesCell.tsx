import { useState } from "react";
import { File } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/shared/ui/popover";
import { Button } from "@/shared/ui/button";
import { FileChip, FileUploadButton } from "@/slices/files";
import type { CellProps } from "./types";

export function FilesCell({ value, onSet, cellClass }: CellProps) {
  const [draft, setDraft] = useState("");
  const files = Array.isArray(value) ? value : [];

  const addUrl = () => {
    const v = draft.trim();
    if (!v) return;
    onSet([...files, v]);
    setDraft("");
  };
  const remove = (file: string) => onSet(files.filter((f) => f !== file));
  const onUploaded = (ref: string) => onSet([...files, ref]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" className={cn(cellClass, "w-full h-auto text-left px-2 py-1 rounded hover:bg-accent/50 flex items-center gap-1 font-normal justify-start [&_svg]:size-3.5")}>
          <File className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          {files.length ? (
            <span className="min-w-0 truncate text-xs">{files.length} file{files.length === 1 ? "" : "s"}</span>
          ) : (
            <span className="text-muted-foreground">Attach file</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2">
        <div className="space-y-2">
          <div className="max-h-48 overflow-y-auto space-y-1">
            {files.map((file) => (
              <FileChip key={file} fileRef={file} onRemove={() => remove(file)} />
            ))}
            {files.length === 0 && <div className="py-6 text-center text-xs text-muted-foreground">No files</div>}
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); addUrl(); }}
            className="flex gap-1"
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Paste URL"
              className="h-8 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-xs outline-none"
            />
            <Button type="submit" className="h-8 rounded-md bg-foreground px-2 text-xs text-background hover:bg-foreground/90">
              Add
            </Button>
          </form>
          <FileUploadButton onUploaded={onUploaded} multiple label="Upload file" />
        </div>
      </PopoverContent>
    </Popover>
  );
}
