"use client";

import { MessageSquare } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { Button } from "@/shared/ui/button";
import { useThreadComments } from "../lib/CommentsContext";
import { CommentItem } from "./CommentItem";
import { CommentComposer } from "./CommentComposer";
import { cn } from "@/shared/lib/utils";

export interface ThreadPopoverLabels {
  /** Heading inside the popover. Default: "Comments". */
  heading?: string;
  /** Open-count suffix shown next to the heading. Receives the open count. */
  openSuffix?: (count: number) => string;
  /** Empty-state copy. Default: "No comments yet.". */
  empty?: string;
  /** aria-label for the trigger button. Default: "Comments". */
  triggerAriaLabel?: string;
}

const DEFAULT_LABELS: Required<ThreadPopoverLabels> = {
  heading: "Comments",
  openSuffix: (n) => `(${n} open)`,
  empty: "No comments yet.",
  triggerAriaLabel: "Comments",
};

interface Props {
  /** Sub-target id (e.g. block id within a page). Omit for host-level. */
  threadId?: string | null;
  /** Viewer info — used to stamp authorName/authorIcon on create + decide
   *  edit-affordance. Adapter passes from its own auth/store. */
  viewer: { id?: string; name: string; icon: string };
  /** Build the args object passed to `create()`. The adapter knows what
   *  shape the backend expects. */
  buildCreateArgs: (text: string) => Record<string, unknown>;
  /** Override copy. */
  labels?: ThreadPopoverLabels;
  /** Custom trigger node. Defaults to a MessageSquare icon button. */
  trigger?: React.ReactNode;
}

/** Domain-neutral comments thread popover. Renderless w/ respect to host
 *  semantics — receives a `threadId` (sub-target) + viewer info + an
 *  adapter-built create-args builder. The Nosion-flavoured wrapper lives
 *  in `adapters/BlockCommentsPopover.tsx`. */
export function ThreadPopover({
  threadId,
  viewer,
  buildCreateArgs,
  labels,
  trigger,
}: Props) {
  const t = { ...DEFAULT_LABELS, ...labels };
  const { items, openCount, create, update, resolve, remove } =
    useThreadComments(threadId);

  const onCreate = (text: string) => {
    create(buildCreateArgs(text));
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        {trigger ?? (
          <Button
            variant="ghost"
            size="icon"
            aria-label={t.triggerAriaLabel}
            className={cn(
              "h-auto w-auto p-1 text-muted-foreground relative [&_svg]:size-3.5",
              openCount > 0 && "text-brand",
            )}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            {openCount > 0 && (
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-brand text-[8px] text-white flex items-center justify-center font-bold">
                {openCount}
              </span>
            )}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-2">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
          {t.heading} {openCount > 0 && (
            <span className="text-brand">{t.openSuffix(openCount)}</span>
          )}
        </div>
        <div className="max-h-72 overflow-y-auto space-y-1.5 mb-2">
          {items.length === 0 && (
            <div className="px-1 py-4 text-center text-xs text-muted-foreground">
              {t.empty}
            </div>
          )}
          {items.map((c) => {
            const isAuthor = !!c.authorId && c.authorId === viewer.id;
            return (
              <CommentItem
                key={c.id}
                comment={c}
                onUpdate={(text) => update({ id: c.id, text })}
                onResolve={(resolved) => resolve({ id: c.id, resolved })}
                onRemove={() => remove({ id: c.id })}
                canEdit={isAuthor}
                canDelete
                canResolve
              />
            );
          })}
        </div>
        <CommentComposer onSubmit={onCreate} />
      </PopoverContent>
    </Popover>
  );
}
