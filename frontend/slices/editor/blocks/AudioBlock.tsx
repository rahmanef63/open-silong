import type { Block } from "@/shared/types/domain";
import type { BlockRendererProps } from "@/shared/types";
import { Button } from "@/shared/ui/button";
import { useMediaUpload } from "./media/useUpload";
import { MediaDropzone } from "./media/MediaDropzone";

interface Props extends BlockRendererProps {
  block: Block;
  onUpdate: (patch: Partial<Block>) => void;
}

export function AudioBlock({ block, onUpdate }: Props) {
  const { uploading, onUploadFile } = useMediaUpload("audio", (url) => onUpdate({ url }));

  if (!block.url) {
    return (
      <MediaDropzone
        kind="audio"
        uploading={uploading}
        onFile={onUploadFile}
        onUrl={(url) => onUpdate({ url })}
      />
    );
  }

  return (
    <div className="group/audio rounded-md border border-border bg-card p-2">
      <audio
        controls
        src={block.url}
        className="w-full"
        preload="metadata"
      />
      <div
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => onUpdate({ caption: (e.currentTarget as HTMLElement).innerText })}
        data-placeholder="Caption"
        className="mt-1 text-xs text-muted-foreground outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/40"
      >
        {block.caption ?? ""}
      </div>
      <div className="mt-1 flex justify-end opacity-0 group-hover/audio:opacity-100 transition">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onUpdate({ url: undefined })}
          className="h-auto px-2 py-0.5 text-[11px] font-normal text-muted-foreground hover:bg-transparent hover:text-foreground"
        >
          Replace
        </Button>
      </div>
    </div>
  );
}
