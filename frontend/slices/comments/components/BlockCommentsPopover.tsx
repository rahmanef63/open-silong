import { MessageSquare } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { useStore } from "@/shared/lib/store";
import { useBlockComments } from "../lib/PageCommentsContext";
import { CommentItem } from "./CommentItem";
import { CommentComposer } from "./CommentComposer";
import { cn } from "@/shared/lib/utils";

interface Props {
  pageId: string;
  blockId: string;
  trigger?: React.ReactNode;
}

export function BlockCommentsPopover({ pageId, blockId, trigger }: Props) {
  const { user } = useStore();
  const { items, openCount, create, update, resolve, remove } = useBlockComments(blockId);

  const onCreate = (text: string) => {
    create({
      pageId,
      blockId,
      text,
      authorName: user.name,
      authorIcon: user.icon,
    });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        {trigger ?? (
          <button
            aria-label="Comments"
            className={cn(
              "rounded p-1 hover:bg-accent text-muted-foreground relative",
              openCount > 0 && "text-brand",
            )}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            {openCount > 0 && (
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-brand text-[8px] text-white flex items-center justify-center font-bold">
                {openCount}
              </span>
            )}
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-2">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
          Comments {openCount > 0 && <span className="text-brand">({openCount} open)</span>}
        </div>
        <div className="max-h-72 overflow-y-auto space-y-1.5 mb-2">
          {items.length === 0 && (
            <div className="px-1 py-4 text-center text-xs text-muted-foreground">
              No comments yet.
            </div>
          )}
          {items.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              onUpdate={(text) => update({ id: c.id, text })}
              onResolve={(resolved) => resolve({ id: c.id, resolved })}
              onRemove={() => remove({ id: c.id })}
            />
          ))}
        </div>
        <CommentComposer onSubmit={onCreate} />
      </PopoverContent>
    </Popover>
  );
}
