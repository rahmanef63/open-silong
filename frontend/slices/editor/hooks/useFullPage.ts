"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Block, Page } from "@/shared/types/domain";

/** Subscribe to a single full page (with `blocks`). The store's pages array
 *  carries only meta (no blocks) — this hook is the editor's source of
 *  truth for the page being viewed. Re-broadcasts only when this page
 *  changes; unrelated page edits no longer cause a render here. */
export function useFullPage(id: string | null | undefined): Page | null | undefined {
  const doc = useQuery(api.pages.getById, id ? { id } : "skip");
  if (doc === undefined) return undefined; // loading
  if (doc === null) return null; // not found / unauthorized
  return {
    id: String(doc._id),
    parentId: doc.parentId,
    title: doc.title,
    icon: doc.icon,
    cover: doc.cover,
    blocks: (doc.blocks ?? []) as Block[],
    favorite: doc.favorite,
    trashed: doc.trashed,
    isPublic: doc.isPublic,
    rowOfDatabaseId: doc.rowOfDatabaseId,
    rowProps: doc.rowProps,
    font: doc.font as Page["font"],
    smallText: doc.smallText,
    fullWidth: doc.fullWidth,
    locked: doc.locked,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    databaseHostFor: doc.databaseHostFor,
    shareSlug: doc.shareSlug,
    shareIndexable: doc.shareIndexable,
    wiki: doc.wiki,
  };
}
