"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Comment } from "../types";

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
  /** The host id the provider was instantiated with (e.g. pageId). */
  targetId: string;
  /** Optional discriminator the adapter passed in (e.g. "page"). */
  targetKind?: string;
  /** All comments for this target, sorted oldest → newest. */
  all: Comment[];
  /** Comments with no `targetSubId` set (i.e. host-level / page-level). */
  hostLevel: Comment[];
  /** Open-count among `hostLevel`. */
  hostOpenCount: number;
  /** Comments grouped by `targetSubId` (e.g. by block id). */
  bySubId: Map<string, Comment[]>;
  /** Open-count grouped by `targetSubId`. */
  openCountBySubId: Map<string, number>;
}

const Ctx = createContext<CommentsContextValue | null>(null);

const EMPTY: Comment[] = [];

interface ProviderProps extends CommentMutators {
  /** Host id the provider scopes to. */
  targetId: string;
  /** Optional kind discriminator stamped on `value.targetKind`. */
  targetKind?: string;
  /** Pre-fetched comments. The adapter is responsible for invoking its own
   *  fetcher (Convex `useQuery`, REST hook, …) and passing the result here.
   *  Pass `undefined` while loading. */
  comments: Comment[] | undefined;
  children: ReactNode;
}

/** Renderless comments provider. Buckets a flat list by `targetSubId` and
 *  exposes mutator passthroughs. No backend assumptions, no Convex imports. */
export function CommentsProvider({
  targetId,
  targetKind,
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
      if (c.targetSubId) {
        const arr = bySubId.get(c.targetSubId) ?? [];
        arr.push(c);
        bySubId.set(c.targetSubId, arr);
        if (!c.resolved) {
          openCountBySubId.set(
            c.targetSubId,
            (openCountBySubId.get(c.targetSubId) ?? 0) + 1,
          );
        }
      } else {
        hostLevel.push(c);
        if (!c.resolved) hostOpenCount++;
      }
    }

    return {
      isLoading: comments === undefined,
      targetId,
      targetKind,
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
  }, [comments, targetId, targetKind, create, update, resolve, remove]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useComments(): CommentsContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useComments must be used inside CommentsProvider");
  return v;
}

/** Read comments scoped to a sub-target (e.g. a single block within a page).
 *  When `subId` is omitted/null, returns host-level comments + counts. */
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
