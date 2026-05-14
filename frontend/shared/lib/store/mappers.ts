import type { Database, Page } from "@/shared/types/domain";

export function toPage(doc: any): Page {
  return {
    id: doc._id, parentId: doc.parentId, title: doc.title, icon: doc.icon, cover: doc.cover,
    blocks: doc.blocks ?? [], favorite: doc.favorite, trashed: doc.trashed, isPublic: doc.isPublic,
    shareSlug: doc.shareSlug,
    shareIndexable: doc.shareIndexable,
    rowOfDatabaseId: doc.rowOfDatabaseId, rowProps: doc.rowProps,
    font: doc.font, smallText: doc.smallText, fullWidth: doc.fullWidth, locked: doc.locked,
    wiki: doc.wiki,
    createdAt: doc.createdAt, updatedAt: doc.updatedAt,
    databaseHostFor: doc.databaseHostFor,
    blockCount: doc.blockCount,
    previewText: doc.previewText,
  };
}

export function toDatabase(doc: any): Database {
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
