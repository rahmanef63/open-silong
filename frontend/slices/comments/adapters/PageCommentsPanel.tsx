"use client";

/** Nosion-bound page-level comments panel. CONSUMER ONLY — wires the
 *  Nosion store viewer + Convex create-args shape into the renderless
 *  CommentItem + CommentComposer primitives. Excluded from kitab UP-sync. */

import { MessageSquare } from "lucide-react";
import { useStore } from "@/shared/lib/store";
import { useComments } from "../lib/CommentsContext";
import { CommentItem } from "../components/CommentItem";
import { CommentComposer } from "../components/CommentComposer";

interface Props {
  pageId: string;
}

export function PageCommentsPanel({ pageId }: Props) {
  const { user } = useStore();
  const {
    hostLevel,
    hostOpenCount: openCount,
    create,
    update,
    resolve,
    remove,
  } = useComments();

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
        {hostLevel.map((c) => {
          const isAuthor = !!c.authorId && c.authorId === user.id;
          // Within the dashboard, the viewer is always the page owner —
          // the page-by-id query rejects access otherwise. Hence delete +
          // resolve are always allowed here. Edit is author-only.
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
      <div className="mt-3">
        <CommentComposer onSubmit={onCreate} placeholder="Add a comment to this page…" />
      </div>
    </section>
  );
}
