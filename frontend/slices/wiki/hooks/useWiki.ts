"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useStore } from "@/shared/lib/store";
import type { WikiMeta } from "../types";

export function useWiki(pageId: string | undefined): {
  isLoading: boolean;
  meta: WikiMeta | null;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
  verify: (next?: boolean) => Promise<void>;
} {
  const { user } = useStore();
  const page = useQuery(
    api.pages.getById,
    pageId ? { id: pageId } : "skip",
  );
  const enableMut = useMutation(api.features.wiki.mutations.enable);
  const disableMut = useMutation(api.features.wiki.mutations.disable);
  const verifyMut = useMutation(api.features.wiki.mutations.verify);

  const meta: WikiMeta | null = page?.wiki
    ? {
        pageId: page._id as string,
        verified: page.wiki.verified,
        ownerName: page.wiki.ownerName,
        ownerIcon: page.wiki.ownerIcon,
        verifiedAt: page.wiki.verifiedAt ?? null,
      }
    : null;

  return {
    isLoading: pageId ? page === undefined : false,
    meta,
    enable: async () => {
      if (!pageId) return;
      await enableMut({
        pageId: pageId as Id<"pages">,
        ownerName: user?.name ?? "Anonymous",
        ownerIcon: user?.icon ?? "📄",
      });
    },
    disable: async () => {
      if (!pageId) return;
      await disableMut({ pageId: pageId as Id<"pages"> });
    },
    verify: async (next = true) => {
      if (!pageId) return;
      await verifyMut({ pageId: pageId as Id<"pages">, verified: next });
    },
  };
}
