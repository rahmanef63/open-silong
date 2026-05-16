/** Nosion-bound standalone hook (no Provider needed). Used by analytics +
 *  any caller that needs a flat comment list outside the dashboard editor.
 *  CONSUMER ONLY — kitab UP-sync surface uses `useCommentsCore` from
 *  `hooks/useCommentsCore.ts` instead. */

import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Comment } from "../types";

function toComment(doc: any): Comment {
  return {
    id: doc._id,
    target: {
      kind: "page",
      id: doc.pageId,
      subId: doc.blockId ?? undefined,
    },
    text: doc.text,
    authorName: doc.authorName,
    authorIcon: doc.authorIcon,
    resolved: doc.resolved,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    authorId: doc.userId,
  };
}

export function useStandaloneComments(opts: { pageId?: string; blockId?: string }) {
  const byPage = useQuery(
    api["features/comments/queries"].listForPage,
    opts.pageId ? { pageId: opts.pageId } : "skip",
  );
  const byBlock = useQuery(
    api["features/comments/queries"].listForBlock,
    opts.blockId && opts.pageId ? { blockId: opts.blockId, pageId: opts.pageId } : "skip",
  );

  const create = useMutation(api["features/comments/mutations"].create);
  const update = useMutation(api["features/comments/mutations"].update);
  const resolve = useMutation(api["features/comments/mutations"].resolve);
  const remove = useMutation(api["features/comments/mutations"].remove);

  const raw = (opts.blockId ? byBlock : byPage) ?? [];
  const items: Comment[] = raw
    .map(toComment)
    .sort((a, b) => a.createdAt - b.createdAt);

  return {
    isLoading: raw === undefined,
    items,
    openCount: items.filter((c) => !c.resolved).length,
    create,
    update,
    resolve,
    remove,
  };
}

/** Back-compat alias. */
export { useStandaloneComments as useComments };
