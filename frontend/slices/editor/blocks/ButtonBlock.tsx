import { useState } from "react";
import { ExternalLink, Settings2 } from "lucide-react";
import type { Block } from "@/shared/types/domain";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/shared/ui/popover";
import { Button } from "@/shared/ui/button";

interface Props {
  block: Block;
  onUpdate: (patch: Partial<Block>) => void;
}

export function ButtonBlock({ block, onUpdate }: Props) {
  const [draftLabel, setDraftLabel] = useState(block.text || "Button");
  const [draftUrl, setDraftUrl] = useState(block.url ?? "");

  const onClick = () => {
    if (!block.url) return;
    if (block.url.startsWith("/")) {
      window.location.assign(block.url);
    } else {
      window.open(block.url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="my-1 flex items-center gap-2">
      <Button
        onClick={onClick}
        disabled={!block.url}
        className="inline-flex h-auto items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-brand-foreground shadow-sm transition hover:bg-brand hover:opacity-90 [&_svg]:size-3.5"
      >
        {block.text || "Button"}
        {block.url && <ExternalLink className="h-3.5 w-3.5" />}
      </Button>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className="h-auto rounded p-1 text-muted-foreground [&_svg]:size-3.5"
            aria-label="Configure button"
            title="Configure"
          >
            <Settings2 className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3 space-y-2">
          <label className="block text-[11px] font-medium text-muted-foreground">Label</label>
          <input
            value={draftLabel}
            onChange={(e) => setDraftLabel(e.target.value)}
            onBlur={() => onUpdate({ text: draftLabel })}
            onKeyDown={(e) => { if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur(); }}
            placeholder="Label"
            className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring"
          />
          <label className="block text-[11px] font-medium text-muted-foreground">URL or page path</label>
          <input
            value={draftUrl}
            onChange={(e) => setDraftUrl(e.target.value)}
            onBlur={() => onUpdate({ url: draftUrl.trim() || undefined })}
            onKeyDown={(e) => { if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur(); }}
            placeholder="https://… or /p/<page-id>"
            className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="text-[10px] text-muted-foreground">
            External URLs open in a new tab. Internal paths (e.g. /p/abc) navigate inside the workspace.
          </p>
        </PopoverContent>
      </Popover>
    </div>
  );
}
