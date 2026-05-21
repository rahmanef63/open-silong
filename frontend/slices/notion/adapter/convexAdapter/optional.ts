"use client";

/**
 * Optional capabilities — Convex adapter implementations for the
 * non-required sub-namespaces (ai, presence, user, workspaces,
 * recents, snapshots, search).
 *
 * SKIP-LISTED via rr-sync.json — this file never lands in rr.
 */

import { useMemo } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useStore } from "@/shared/lib/store";
import type {
  AiAdapter,
  PresenceAdapter,
  RecentsAdapter,
  SnapshotsAdapter,
  UserAdapter,
  WorkspacesAdapter,
} from "../types";

/** AI completion via the Convex `ai.chat.complete` action.
 *  Returns the assistant's response as a single string (no streaming
 *  yet — `completeStream` omitted to signal absence to consumers). */
export function useConvexAiAdapter(): AiAdapter {
  const complete = useAction(api.ai.chat.complete);
  return useMemo<AiAdapter>(
    () => ({
      complete: async ({ messages, system, model, maxTokens }) => {
        // temperature is not currently exposed by the Convex action —
        // omitted on call; consumers requesting it get the backend's
        // default temperature.
        const args: {
          messages: typeof messages;
          system?: string;
          model?: string;
          maxTokens?: number;
        } = { messages };
        if (system !== undefined) args.system = system;
        if (model !== undefined) args.model = model;
        if (maxTokens !== undefined) args.maxTokens = maxTokens;
        const result = await complete(args);
        if (typeof result === "string") return result;
        // The action may return a richer shape; coerce defensively.
        const text = (result as { text?: string } | null)?.text;
        return text ?? "";
      },
    }),
    [complete],
  );
}

/** Presence via `api.pageViews.*`. */
export function useConvexPresenceAdapter(): PresenceAdapter {
  const touch = useMutation(api.pageViews.touch);
  return useMemo<PresenceAdapter>(
    () => ({
      useRecentViewers: (pageId) => {
        const viewers = useQuery(
          api.pageViews.recentViewers,
          pageId ? { pageId: pageId as Id<"pages"> } : "skip",
        );
        if (!viewers) return undefined;
        // Convex returns `lastViewedAt` + `image` — adapter contract
        // uses `lastSeenAt` + `icon`. Map at the boundary so the
        // contract stays portable (localStorage adapter can hand
        // back the same shape without a Convex-specific transform).
        return viewers.map((v) => ({
          userId: v.userId as string,
          name: v.name,
          icon: v.image,
          lastSeenAt: v.lastViewedAt,
        }));
      },
      touch: async (pageId) => {
        await touch({ pageId: pageId as Id<"pages"> });
      },
    }),
    [touch],
  );
}

/** Identity from the store (already wired to Convex auth). */
export function useConvexUserAdapter(): UserAdapter {
  const store = useStore();
  return useMemo<UserAdapter>(
    () => ({
      useCurrent: () => store.user,
      useById: (userId) => {
        if (!userId) return undefined;
        // No direct convex user-by-id query in the editor surface
        // today; current = current is what consumers use. Phase 2
        // wires a dedicated query if comment authoring needs it.
        return store.user.id === userId ? store.user : null;
      },
    }),
    [store],
  );
}

/** Workspaces — straight pass-through from the store. */
export function useConvexWorkspacesAdapter(): WorkspacesAdapter {
  const store = useStore();
  return useMemo<WorkspacesAdapter>(
    () => ({
      useList: () => store.workspaces,
      useActive: () => store.workspace,
      setActive: async (workspaceId) => {
        await store.setActiveWorkspace(workspaceId);
      },
      create: async ({ name, emoji }) => {
        return await store.createWorkspace(name, emoji);
      },
    }),
    [store],
  );
}

/** Recents — push only; reads come from store.recents. */
export function useConvexRecentsAdapter(): RecentsAdapter {
  const store = useStore();
  return useMemo<RecentsAdapter>(
    () => ({
      useList: () =>
        store.recents.map((targetId) => ({
          targetType: "page" as const,
          targetId,
          lastVisitedAt: Date.now(),
        })),
      push: async ({ targetId }) => {
        store.pushRecent(targetId);
      },
    }),
    [store],
  );
}

/** Snapshots — list + restore via store. */
export function useConvexSnapshotsAdapter(): SnapshotsAdapter {
  const store = useStore();
  return useMemo<SnapshotsAdapter>(
    () => ({
      useList: (pageId) => {
        const all = store.snapshotsForPage(pageId);
        // PageSnapshot uses `takenAt` — map to the adapter contract's
        // `createdAt` so non-Convex implementations don't have to
        // know the legacy field name.
        return all.map((s) => ({
          id: s.id,
          createdAt: s.takenAt,
          blocks: s.blocks,
          title: s.title,
          icon: s.icon,
        }));
      },
      snapshotIfNeeded: async () => {
        // The store auto-snapshots via its own hook; no-op here.
        // Surfaces calling this explicitly trigger via store's
        // internal cron, not this adapter. Phase 2 wires the manual
        // trigger if needed.
      },
      restore: async ({ snapshotId }) => {
        store.restoreSnapshot(snapshotId);
      },
    }),
    [store],
  );
}
