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
});
