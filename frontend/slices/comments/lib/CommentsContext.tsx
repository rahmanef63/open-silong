"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Comment, TargetRef } from "../types";

/** Generic mutation surface. The provider doesn't know what backend the
 *  consumer uses — it just relays calls. Adapter is responsible for wiring
 *  these to whatever fetcher/mutator the host backend exposes. */
export type CommentMutator = (args: any) => Promise<any>;

export interface CommentMutators {
  create: CommentMutator;
  update: CommentMutator;
  resolve: CommentMutator;
  remove: CommentMutator;
}

export interface CommentsContextValue extends CommentMutators {
  /** True while the underlying fetcher hasn't returned. */
  isLoading: boolean;
  /** The host target the provider was instantiated with. */
  target: TargetRef;
  /** All comments for this target, sorted oldest -> newest. */
  all: Comment[];
  /** Comments with no `target.subId` set (i.e. host-level). */
  hostLevel: Comment[];
  /** Open-count among `hostLevel`. */
  hostOpenCount: number;
  /** Comments grouped by `target.subId`. */
  bySubId: Map<string, Comment[]>;
  /** Open-count grouped by `target.subId`. */
  openCountBySubId: Map<string, number>;
}

const Ctx = createContext<CommentsContextValue | null>(null);

const EMPTY: Comment[] = [];

interface ProviderProps extends CommentMutators {
  /** Host target the provider scopes to. */
  target: TargetRef;
  /** Pre-fetched comments. The adapter is responsible for invoking its own
   *  fetcher (Convex `useQuery`, REST hook, ...) and passing the result here.
   *  Pass `undefined` while loading. */
  comments: Comment[] | undefined;
  children: ReactNode;
}

/** Renderless comments provider. Buckets a flat list by `target.subId` and
 *  exposes mutator passthroughs. No backend assumptions, no Convex imports. */
export function CommentsProvider({
  target,
  comments,
  create,
  update,
  resolve,
  remove,
  children,
}: ProviderProps) {
  const value = useMemo<CommentsContextValue>(() => {
    const all: Comment[] = (comments ?? [])
      .slice()
      .sort((a, b) => a.createdAt - b.createdAt);

    const bySubId = new Map<string, Comment[]>();
    const openCountBySubId = new Map<string, number>();
    const hostLevel: Comment[] = [];
    let hostOpenCount = 0;

    for (const c of all) {
      const sub = c.target?.subId;
      if (sub) {
        const arr = bySubId.get(sub) ?? [];
        arr.push(c);
        bySubId.set(sub, arr);
        if (!c.resolved) {
          openCountBySubId.set(sub, (openCountBySubId.get(sub) ?? 0) + 1);
        }
      } else {
        hostLevel.push(c);
        if (!c.resolved) hostOpenCount++;
      }
    }

    return {
      isLoading: comments === undefined,
      target,
      all,
      hostLevel,
      hostOpenCount,
      bySubId,
      openCountBySubId,
      create,
      update,
      resolve,
      remove,
    };
  }, [comments, target, create, update, resolve, remove]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useComments(): CommentsContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useComments must be used inside CommentsProvider");
  return v;
}

/** Read comments scoped to a sub-target. When `subId` is omitted/null,
 *  returns host-level comments + counts. */
export function useThreadComments(subId?: string | null) {
  const v = useComments();
  if (!subId) {
    return {
      items: v.hostLevel,
      openCount: v.hostOpenCount,
      create: v.create,
      update: v.update,
      resolve: v.resolve,
      remove: v.remove,
    };
  }
  return {
    items: v.bySubId.get(subId) ?? EMPTY,
    openCount: v.openCountBySubId.get(subId) ?? 0,
    create: v.create,
    update: v.update,
    resolve: v.resolve,
    remove: v.remove,
  };
}
