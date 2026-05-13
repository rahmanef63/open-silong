import { GripVertical, MessageSquare, Plus } from "lucide-react";
import { BlockCommentsPopover } from "@/slices/comments";
import { cn } from "@/shared/lib/utils";

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
      <button
        onClick={async () => {
          const id = await addBlock(pageId, index);
          setTimeout(() => document.querySelector<HTMLElement>(`[data-block-id="${id}"]`)?.focus(), 0);
        }}
        className="flex h-6 w-5 items-center justify-center rounded text-muted-foreground hover:bg-accent"
        aria-label="Add block below"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
      <BlockCommentsPopover
        pageId={pageId}
        blockId={blockId}
        trigger={
          <button
            className={cn(
              "relative flex h-6 w-5 items-center justify-center rounded hover:bg-accent",
              openCount > 0 ? "text-brand" : "text-muted-foreground",
            )}
            aria-label="Comments"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            {openCount > 0 && <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-brand" />}
          </button>
        }
      />
    </>
  );
}

export function GripButton({ listeners }: { listeners?: import("@dnd-kit/core/dist/hooks/utilities").SyntheticListenerMap }) {
  return (
    <button
      {...listeners}
      data-block-grip
      title="Drag to move · Shift-click range · ⌘-click toggle"
      aria-label="Drag block"
      className="flex h-6 w-5 items-center justify-center rounded text-muted-foreground hover:bg-accent cursor-grab active:cursor-grabbing"
    >
      <GripVertical className="h-3.5 w-3.5" />
    </button>
  );
}
