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
    /** Wiki mode — treats this page as the canonical entry for a topic. */
    wiki: v.optional(v.object({
      ownerId: v.id("users"),
      ownerName: v.string(),
      ownerIcon: v.string(),
      verified: v.boolean(),
      verifiedAt: v.optional(v.number()),
    })),
    /** Denormalized title + flattened block text. Updated on every page write
     *  so Convex searchIndex can match body content, not just title. */
    searchText: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_parent", ["userId", "parentId"])
    .searchIndex("search_content", {
      searchField: "searchText",
      filterFields: ["userId", "trashed"],
    }),

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
  })
    .index("by_user", ["userId"])
    .searchIndex("search_name", {
      searchField: "name",
      filterFields: ["userId"],
    }),

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

  // === uploaded files (storage ownership ledger) ===
  files: defineTable({
    userId: v.id("users"),
    storageId: v.string(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_storage", ["storageId"]),

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

  // === admin: per-user role + bootstrap ===
  userProfiles: defineTable({
    userId: v.id("users"),
    role: v.union(v.literal("superadmin"), v.literal("admin"), v.literal("user")),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  // === admin: audit log ===
  auditLog: defineTable({
    actorId: v.id("users"),
    actorEmail: v.optional(v.string()),
    kind: v.string(),                       // "role.set" | "feedback.resolve" | "template.upsert" | ...
    target: v.optional(v.string()),         // free-form id of affected entity
    meta: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_created", ["createdAt"])
    .index("by_actor", ["actorId"]),

  // === feedback inbox ===
  feedbackEntries: defineTable({
    userId: v.id("users"),
    userEmail: v.optional(v.string()),
    kind: v.union(v.literal("bug"), v.literal("idea"), v.literal("praise"), v.literal("other")),
    message: v.string(),
    status: v.union(v.literal("open"), v.literal("resolved")),
    createdAt: v.number(),
    resolvedAt: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_user", ["userId"]),

  // === rate limits — fixed-window counter per (userId, scope) ===
  // Pruned lazily by the helper itself; no cron needed at this scale.
  rateLimits: defineTable({
    userId: v.id("users"),
    scope: v.string(),       // e.g. "comments.create", "ai.complete"
    windowStart: v.number(), // epoch ms truncated to bucket boundary
    count: v.number(),
  }).index("by_user_scope", ["userId", "scope"]),

  // === page templates (admin-managed JSON blueprints) ===
  pageTemplates: defineTable({
    name: v.string(),
    icon: v.string(),
    category: v.string(),
    description: v.optional(v.string()),
    json: v.any(),                          // TemplateJson — validated server-side on upsert
    createdBy: v.id("users"),
    isPublished: v.boolean(),
    isSeed: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_published", ["isPublished"])
    .index("by_category", ["category"])
    .index("by_seed_name", ["isSeed", "name"]),
});
