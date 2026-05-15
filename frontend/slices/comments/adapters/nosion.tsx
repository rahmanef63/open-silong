"use client";

/** Nosion-specific comments adapter — CONSUMER ONLY.
 *
 *  Translates the kitab-portable `CommentsProvider` / `ThreadPopover` into
 *  the Nosion-flavoured surface the dashboard mounts:
 *
 *  - Convex `features/comments/queries.listForPage` is wired as the fetcher.
 *  - Convex `features/comments/mutations.{create,update,resolve,remove}`
 *    are wired as the mutator surface.
 *  - Backend doc → portable `Comment` mapping stamps `targetKind="page"`,
 *    `targetId=pageId`, `targetSubId=blockId`.
 *  - Re-exports `PageCommentsProvider`, `useBlockComments`, and
 *    `BlockCommentsPopover` so the rest of the app keeps the historical
 *    naming. Excluded from kitab UP-sync surface.
 */

import { type ReactNode, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useStore } from "@/shared/lib/store";
import {
  CommentsProvider,
  useThreadComments,
  type CommentMutator,
} from "../lib/CommentsContext";
import type { Comment } from "../types";
import { ThreadPopover } from "../components/ThreadPopover";

function toComment(doc: any): Comment {
  return {
    id: doc._id,
    targetKind: "page",
    targetId: doc.pageId,
    targetSubId: doc.blockId,
    text: doc.text,
    authorName: doc.authorName,
    authorIcon: doc.authorIcon,
    resolved: doc.resolved,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    authorId: doc.userId,
  };
}

/** Nosion adapter — wraps the renderless `CommentsProvider` with the
 *  Convex-backed fetcher + mutators for a page. */
export function PageCommentsProvider({
  pageId,
  children,
}: {
  pageId: string;
  children: ReactNode;
}) {
  const raw = useQuery(api["features/comments/queries"].listForPage, { pageId });
  const create = useMutation(api["features/comments/mutations"].create) as CommentMutator;
  const update = useMutation(api["features/comments/mutations"].update) as CommentMutator;
  const resolve = useMutation(api["features/comments/mutations"].resolve) as CommentMutator;
  const remove = useMutation(api["features/comments/mutations"].remove) as CommentMutator;

  const comments = useMemo<Comment[] | undefined>(
    () => (raw === undefined ? undefined : raw.map(toComment)),
    [raw],
  );

  return (
    <CommentsProvider
      targetId={pageId}
      targetKind="page"
      comments={comments}
      create={create}
      update={update}
      resolve={resolve}
      remove={remove}
    >
      {children}
    </CommentsProvider>
  );
}

/** Back-compat alias. Block comments are sub-target threads keyed by
 *  block id within a page. */
export function useBlockComments(blockId: string) {
  return useThreadComments(blockId);
}

/** Nosion-flavoured `BlockCommentsPopover` — wires Nosion store viewer +
 *  Convex create-args shape into the renderless `ThreadPopover`. */
export function BlockCommentsPopover({
  pageId,
  blockId,
  trigger,
}: {
  pageId: string;
  blockId: string;
  trigger?: React.ReactNode;
}) {
  const { user } = useStore();
  return (
    <ThreadPopover
      threadId={blockId}
      viewer={user}
      buildCreateArgs={(text) => ({
        pageId,
        blockId,
        text,
        authorName: user.name,
        authorIcon: user.icon,
      })}
      trigger={trigger}
    />
  );
}
