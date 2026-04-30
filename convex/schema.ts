import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  workspaces: defineTable({
    userId: v.id("users"),
    name: v.string(),
    emoji: v.string(),
  }).index("by_user", ["userId"]),

  pages: defineTable({
    userId: v.id("users"),
    parentId: v.union(v.string(), v.null()),
    title: v.string(),
    icon: v.string(),
    cover: v.union(v.string(), v.null()),
    blocks: v.array(v.any()),
    favorite: v.boolean(),
    trashed: v.boolean(),
    isPublic: v.optional(v.boolean()),
    rowOfDatabaseId: v.optional(v.string()),
    rowProps: v.optional(v.any()),
    font: v.optional(v.string()),
    smallText: v.optional(v.boolean()),
    fullWidth: v.optional(v.boolean()),
    locked: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  databases: defineTable({
    userId: v.id("users"),
    name: v.string(),
    icon: v.string(),
    properties: v.array(v.any()),
    rowIds: v.array(v.string()),
    views: v.array(v.any()),
    activeViewId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    uniqueIdCounter: v.optional(v.number()),
    templates: v.optional(v.array(v.any())),
    defaultTemplateId: v.optional(v.union(v.string(), v.null())),
    subItemsParentPropId: v.optional(v.union(v.string(), v.null())),
    trashed: v.optional(v.boolean()),
  }).index("by_user", ["userId"]),

  preferences: defineTable({
    userId: v.id("users"),
    theme: v.string(),
    sidebarDensity: v.string(),
    defaultPageSort: v.string(),
    editorBehavior: v.string(),
    landingView: v.string(),
    lastOpenedPageId: v.union(v.string(), v.null()),
  }).index("by_user", ["userId"]),

  snapshots: defineTable({
    userId: v.id("users"),
    pageId: v.string(),
    authorId: v.string(),
    authorName: v.string(),
    takenAt: v.number(),
    title: v.string(),
    icon: v.string(),
    cover: v.union(v.string(), v.null()),
    blocks: v.array(v.any()),
    rowProps: v.optional(v.any()),
  })
    .index("by_user", ["userId"])
    .index("by_user_page", ["userId", "pageId"]),

  recents: defineTable({
    userId: v.id("users"),
    pageIds: v.array(v.string()),
  }).index("by_user", ["userId"]),

  // === inbox ===
  notifications: defineTable({
    userId: v.id("users"),
    kind: v.string(),                       // "mention" | "comment" | "share" | "system" | "update"
    title: v.string(),
    body: v.optional(v.string()),
    pageId: v.optional(v.string()),
    blockId: v.optional(v.string()),
    actorName: v.optional(v.string()),
    actorIcon: v.optional(v.string()),
    read: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_unread", ["userId", "read"]),

  // === comments ===
  comments: defineTable({
    userId: v.id("users"),                  // author
    pageId: v.string(),
    blockId: v.optional(v.string()),        // null = page-level comment
    text: v.string(),
    authorName: v.string(),
    authorIcon: v.string(),
    resolved: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_page", ["pageId"])
    .index("by_block", ["blockId"]),
});
