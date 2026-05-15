"use client";

import type { ReactNode } from "react";
import type { Comment, TargetRef } from "../types";
import type { CommentsBindings } from "../hooks/useCommentsCore";
import { useCommentsCore } from "../hooks/useCommentsCore";

/**
 * Renderless thread wrapper — the kitab slice owns load state, list ordering,
 * and forbidden-word guards. The consumer supplies the visual host via
 * `children` (render-prop). Domain-neutral by design: no built-in skin.
 *
 * Usage:
 *
 *   <CommentsThread target={{ kind: "page", id: someId }} bindings={bindings}>
 *     {({ items, openCount, create, isLoading }) => (
 *       <YourThreadSkin
 *         items={items}
 *         openCount={openCount}
 *         onSubmit={(text) => create({ target: { kind: "page", id: someId }, text })}
 *         loading={isLoading}
 *       />
 *     )}
 *   </CommentsThread>
 */
export type CommentsThreadProps = {
  target: TargetRef;
  bindings: CommentsBindings;
  forbiddenWords?: readonly string[];
  children: (state: {
    isLoading: boolean;
    items: Comment[];
    openCount: number;
    create: CommentsBindings["create"];
    update: CommentsBindings["update"];
    resolve: CommentsBindings["resolve"];
    remove: CommentsBindings["remove"];
  }) => ReactNode;
};

export function CommentsThread({
  target,
  bindings,
  forbiddenWords,
  children,
}: CommentsThreadProps) {
  const state = useCommentsCore(bindings, { target, forbiddenWords });
  return <>{children(state)}</>;
}
