import { MessageSquare } from "lucide-react";
import { useStore } from "@/lib/store";
import { useComments } from "../hooks/useComments";
import { CommentItem } from "./CommentItem";
import { CommentComposer } from "./CommentComposer";

interface Props {
  pageId: string;
}

export function PageCommentsPanel({ pageId }: Props) {
  const { user } = useStore();
  const { items, openCount, create, update, resolve, remove } = useComments({ pageId });

  // Filter to page-level only (no blockId). Block comments render inline at the block.
  const pageLevel = items.filter((c) => !c.blockId);

  const onCreate = (text: string) => {
    create({
      pageId,
      text,
      authorName: user.name,
      authorIcon: user.icon,
    });
  };

  return (
    <section className="mt-12 border-t border-border pt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1.5">
          <MessageSquare className="h-3 w-3" />
          Comments {openCount > 0 && <span className="text-brand normal-case">({openCount} open)</span>}
        </h3>
      </div>
      <div className="space-y-2">
        {pageLevel.map((c) => (
          <CommentItem
            key={c.id}
            comment={c}
            onUpdate={(text) => update({ id: c.id, text })}
            onResolve={(resolved) => resolve({ id: c.id, resolved })}
            onRemove={() => remove({ id: c.id })}
          />
        ))}
      </div>
      <div className="mt-3">
        <CommentComposer onSubmit={onCreate} placeholder="Add a comment to this page…" />
      </div>
    </section>
  );
}
