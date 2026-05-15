"use client";

import type { ReactNode } from "react";
import type { TargetRef } from "../types";
import type { CommentsBindings } from "../hooks/useCommentsCore";
import { useCommentsCore } from "../hooks/useCommentsCore";

/**
 * Renderless anchor — exposes the open-count for a target so the consumer
 * can render whatever badge/button skin matches the host UI. Optional
 * `pathMap` resolves a deep link to the thread page when the host wants
 * navigation.
 *
 * Usage:
 *
 *   <CommentsAnchor
 *     target={{ kind: "blog", id: slug }}
 *     bindings={bindings}
 *     pathMap={(t) => `/blog/${t.id}#comments`}
 *   >
 *     {({ openCount, href }) => (
 *       <Link href={href}>{openCount > 0 ? `${openCount} comments` : "Add comment"}</Link>
 *     )}
 *   </CommentsAnchor>
 */
export type CommentsAnchorProps = {
  target: TargetRef;
  bindings: CommentsBindings;
  /** Resolve a deep link for the target. Optional — when omitted `href` is null. */
  pathMap?: (target: TargetRef) => string;
  children: (state: {
    isLoading: boolean;
    openCount: number;
    totalCount: number;
    href: string | null;
  }) => ReactNode;
};

export function CommentsAnchor({
  target,
  bindings,
  pathMap,
  children,
}: CommentsAnchorProps) {
  const state = useCommentsCore(bindings, { target });
  const href = pathMap ? pathMap(target) : null;
  return (
    <>
      {children({
        isLoading: state.isLoading,
        openCount: state.openCount,
        totalCount: state.items.length,
        href,
      })}
    </>
  );
}
