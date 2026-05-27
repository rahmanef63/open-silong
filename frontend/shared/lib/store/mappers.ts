import type { Doc } from "@convex/_generated/dataModel";
import type { Database, Page } from "@/shared/types/domain";

export function toPage(doc: Doc<"pages">): Page {
  // Schema stores cover.type / font as v.string(); domain narrows them to
  // unions. Trust the writer (every write goes through validated mutations)
  // and cast at the boundary rather than re-validating in the mapper.
  return {
    id: doc._id,
    parentId: doc.parentId,
    title: doc.title,
    icon: doc.icon,
    cover: doc.cover as Page["cover"],
    blocks: doc.blocks ?? [],
    favorite: doc.favorite,
    trashed: doc.trashed,
    isPublic: doc.isPublic,
    workspaceId: doc.workspaceId,
    shareSlug: doc.shareSlug,
    shareIndexable: doc.shareIndexable,
    rowOfDatabaseId: doc.rowOfDatabaseId,
    rowProps: doc.rowProps,
    font: doc.font as Page["font"],
    smallText: doc.smallText,
    fullWidth: doc.fullWidth,
    locked: doc.locked,
    wiki: doc.wiki,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    databaseHostFor: doc.databaseHostFor,
    // Denormalised reader fields written by `convex/pages.ts` indexers.
    blockCount: (doc as Doc<"pages"> & { blockCount?: number }).blockCount,
    previewText: (doc as Doc<"pages"> & { previewText?: string }).previewText,
  };
}

export function toDatabase(doc: Doc<"databases">): Database {
  return {
    id: doc._id, name: doc.name, icon: doc.icon,
    properties: doc.properties ?? [], rowIds: doc.rowIds ?? [],
    views: doc.views ?? [], activeViewId: doc.activeViewId,
    createdAt: doc.createdAt, updatedAt: doc.updatedAt,
    uniqueIdCounter: doc.uniqueIdCounter,
    templates: doc.templates,
    defaultTemplateId: doc.defaultTemplateId ?? null,
    subItemsParentPropId: doc.subItemsParentPropId ?? null,
    locked: !!doc.locked,
    trashed: !!doc.trashed,
  };
}
