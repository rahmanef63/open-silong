import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Comment } from "../types";

function toComment(doc: any): Comment {
  return {
    id: doc._id,
    pageId: doc.pageId,
    blockId: doc.blockId,
    text: doc.text,
    authorName: doc.authorName,
    authorIcon: doc.authorIcon,
    resolved: doc.resolved,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export function useComments(opts: { pageId?: string; blockId?: string }) {
  const byPage = useQuery(
    api["features/comments/queries"].listForPage,
    opts.pageId ? { pageId: opts.pageId } : "skip",
  );
  const byBlock = useQuery(
    api["features/comments/queries"].listForBlock,
    opts.blockId ? { blockId: opts.blockId } : "skip",
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
