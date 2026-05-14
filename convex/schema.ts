import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  /** Workspace = collaboration boundary. Every user has exactly one
   *  `isPersonal` workspace (auto-created at first auth). Additional
   *  workspaces are user-created via `workspaces.create`. Membership
   *  lives in `workspaceMembers`; `ownerId` is the original creator
   *  (cannot be changed without ownership transfer flow). `userId`
   *  retained as alias of `ownerId` for backward-compat with legacy
   *  rows; new code reads `ownerId`. */
  workspaces: defineTable({
    userId: v.id("users"),                   // legacy alias for ownerId — retained
    ownerId: v.optional(v.id("users")),      // canonical owner (filled by migration + new rows)
    name: v.string(),
    emoji: v.string(),
    slug: v.optional(v.string()),            // url-safe (lowercase, digits, hyphens)
    isPersonal: v.optional(v.boolean()),     // true for the user's auto-created workspace
    createdAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_owner", ["ownerId"])
    .index("by_slug", ["slug"]),

  /** Invite codes minted by workspace owners. `code` is a base64url
   *  random secret (24 bytes). Single-use: `accept` patches
   *  `acceptedAt` + `acceptedBy`, after which the row is dead. Owner
   *  can revoke before acceptance via `delete`. Expiry: 14 days from
   *  creation, enforced in `accept`. */
  workspaceInvites: defineTable({
    workspaceId: v.id("workspaces"),
    code: v.string(),
    role: v.union(v.literal("editor"), v.literal("viewer")),
    invitedBy: v.id("users"),
    createdAt: v.number(),
    acceptedAt: v.optional(v.number()),
    acceptedBy: v.optional(v.id("users")),
  })
    .index("by_code", ["code"])
    .index("by_workspace", ["workspaceId"]),

  /** workspace ↔ user membership ledger. Auto-seeded with role:"owner"
   *  for the workspace owner. Future invites add role:"editor"|"viewer"
   *  rows. `by_user_workspace` lets `requireWorkspaceMember` resolve
   *  in O(1). */
  workspaceMembers: defineTable({
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    role: v.union(v.literal("owner"), v.literal("editor"), v.literal("viewer")),
    invitedBy: v.optional(v.id("users")),
    joinedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_user", ["userId"])
    .index("by_user_workspace", ["userId", "workspaceId"])
    .index("by_workspace_user", ["workspaceId", "userId"]),

  pages: defineTable({
    userId: v.id("users"),
    /** Workspace this page belongs to. Optional during transition —
     *  legacy rows resolve to the owner's personal workspace via the
     *  fallback rule in `requireWorkspaceMember`. */
    workspaceId: v.optional(v.id("workspaces")),
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
    /** Set on host pages whose primary content is a single database
     *  block. Holds the ids of databases this page hosts (today: 1 id;
     *  array shape keeps room for future split-screen multi-db hosts).
     *  Stamped by `databases` "Open as page" and by template-instantiated
     *  database-pages. Lets full-page-DB detection skip walking blocks. */
    databaseHostFor: v.optional(v.array(v.string())),
    font: v.optional(v.string()),
    smallText: v.optional(v.boolean()),
    fullWidth: v.optional(v.boolean()),
    locked: v.optional(v.boolean()),
    /** Custom share-link slug (lowercase a–z 0–9 -, 3–60 chars).
     *  Optional — defaults to the convex id. Unique per user; the
     *  by_share_slug index lets `/share/<slug>` resolve in O(1). */
    shareSlug: v.optional(v.string()),
    /** Allow search engines to index the public share page. Default false:
     *  the share is reachable but `noindex,nofollow` is emitted. */
    shareIndexable: v.optional(v.boolean()),
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
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_parent", ["workspaceId", "parentId"])
    .index("by_share_slug", ["shareSlug"])
    .searchIndex("search_content", {
      searchField: "searchText",
      filterFields: ["userId", "workspaceId", "trashed"],
    }),

  databases: defineTable({
    userId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
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
    .index("by_workspace", ["workspaceId"])
    .searchIndex("search_name", {
      searchField: "name",
      filterFields: ["userId", "workspaceId"],
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
    workspaceId: v.optional(v.id("workspaces")),
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
    .index("by_user_page", ["userId", "pageId"])
    .index("by_workspace_page", ["workspaceId", "pageId"]),

  recents: defineTable({
    userId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
    pageIds: v.array(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_workspace", ["userId", "workspaceId"]),

  // === inbox ===
  notifications: defineTable({
    userId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
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
    workspaceId: v.optional(v.id("workspaces")),
    storageId: v.string(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_workspace", ["workspaceId"])
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
    /** Updated by `users.touchLastSeen` — debounced ~5 min from the
     *  client. Powers real DAU/WAU/MAU in the admin overview. Optional
     *  so existing rows don't need a backfill. */
    lastSeenAt: v.optional(v.number()),
    /** Last selected workspace — drives `getActiveWorkspaceId`.
     *  Falls back to user's personal workspace when null/missing. */
    activeWorkspaceId: v.optional(v.id("workspaces")),
  })
    .index("by_user", ["userId"])
    .index("by_lastSeen", ["lastSeenAt"]),

  // === MCP per-user tokens ===
  mcpTokens: defineTable({
    userId: v.id("users"),
    /** SHA-256 hex of the plaintext token. Lookup uses by_hash; plaintext
     *  is shown to the user only at issue-time. */
    tokenHash: v.string(),
    label: v.string(),
    createdAt: v.number(),
    lastUsedAt: v.optional(v.number()),
    revoked: v.boolean(),
  })
    .index("by_user", ["userId"])
    .index("by_hash", ["tokenHash"]),

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
    /** Promotional images — first is hero thumb, rest in detail accordion. */
    images: v.optional(v.array(v.string())),
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
