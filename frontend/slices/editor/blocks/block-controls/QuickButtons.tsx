import { GripVertical, MessageSquare, Plus } from "lucide-react";
import { BlockCommentsPopover } from "@/slices/comments";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";

interface Props {
  pageId: string;
  blockId: string;
  index: number;
  openCount: number;
  listeners?: import("@dnd-kit/core/dist/hooks/utilities").SyntheticListenerMap;
  addBlock: (pageId: string, after: number) => Promise<string | undefined>;
}

export function QuickButtons({ pageId, blockId, index, openCount, listeners, addBlock }: Props) {
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={async () => {
          const id = await addBlock(pageId, index);
          setTimeout(() => document.querySelector<HTMLElement>(`[data-block-id="${id}"]`)?.focus(), 0);
        }}
        className="h-6 w-5 p-0 rounded text-muted-foreground [&_svg]:size-3.5"
        aria-label="Add block below"
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
      <BlockCommentsPopover
        pageId={pageId}
        blockId={blockId}
        trigger={
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "relative h-6 w-5 p-0 rounded [&_svg]:size-3.5",
              openCount > 0 ? "text-brand" : "text-muted-foreground",
            )}
            aria-label="Comments"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            {openCount > 0 && <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-brand" />}
          </Button>
        }
      />
    </>
  );
}

export function GripButton({ listeners }: { listeners?: import("@dnd-kit/core/dist/hooks/utilities").SyntheticListenerMap }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      {...listeners}
      data-block-grip
      title="Drag to move · Shift-click range · ⌘-click toggle"
      aria-label="Drag block"
      className="h-6 w-5 p-0 rounded text-muted-foreground cursor-grab active:cursor-grabbing [&_svg]:size-3.5"
    >
      <GripVertical className="h-3.5 w-3.5" />
    </Button>
  );
}
