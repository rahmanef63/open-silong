import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Comment } from "../types";

interface CommentMutations {
  create: ReturnType<typeof useMutation<typeof api["features/comments/mutations"]["create"]>>;
  update: ReturnType<typeof useMutation<typeof api["features/comments/mutations"]["update"]>>;
  resolve: ReturnType<typeof useMutation<typeof api["features/comments/mutations"]["resolve"]>>;
  remove: ReturnType<typeof useMutation<typeof api["features/comments/mutations"]["remove"]>>;
}

interface PageCommentsValue extends CommentMutations {
  isLoading: boolean;
  pageId: string;
  all: Comment[];
  pageLevel: Comment[];
  byBlock: Map<string, Comment[]>;
  openCountByBlock: Map<string, number>;
  pageOpenCount: number;
}

const Ctx = createContext<PageCommentsValue | null>(null);

const EMPTY: Comment[] = [];

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

export function PageCommentsProvider({ pageId, children }: { pageId: string; children: ReactNode }) {
  const raw = useQuery(api["features/comments/queries"].listForPage, { pageId });
  const create = useMutation(api["features/comments/mutations"].create);
  const update = useMutation(api["features/comments/mutations"].update);
  const resolve = useMutation(api["features/comments/mutations"].resolve);
  const remove = useMutation(api["features/comments/mutations"].remove);

  const value = useMemo<PageCommentsValue>(() => {
    const all: Comment[] = (raw ?? [])
      .map(toComment)
      .sort((a, b) => a.createdAt - b.createdAt);

    const byBlock = new Map<string, Comment[]>();
    const openCountByBlock = new Map<string, number>();
    const pageLevel: Comment[] = [];
    let pageOpenCount = 0;

    for (const c of all) {
      if (c.blockId) {
        const arr = byBlock.get(c.blockId) ?? [];
        arr.push(c);
        byBlock.set(c.blockId, arr);
        if (!c.resolved) {
          openCountByBlock.set(c.blockId, (openCountByBlock.get(c.blockId) ?? 0) + 1);
        }
      } else {
        pageLevel.push(c);
        if (!c.resolved) pageOpenCount++;
      }
    }

    return {
      isLoading: raw === undefined,
      pageId,
      all,
      pageLevel,
      byBlock,
      openCountByBlock,
      pageOpenCount,
      create,
      update,
      resolve,
      remove,
    };
  }, [raw, pageId, create, update, resolve, remove]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePageComments(): PageCommentsValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePageComments must be used inside PageCommentsProvider");
  return v;
}

export function useBlockComments(blockId: string) {
  const v = usePageComments();
  return {
    items: v.byBlock.get(blockId) ?? EMPTY,
    openCount: v.openCountByBlock.get(blockId) ?? 0,
    create: v.create,
    update: v.update,
    resolve: v.resolve,
    remove: v.remove,
  };
}
