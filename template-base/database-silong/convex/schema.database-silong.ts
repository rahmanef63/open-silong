/**
 * Database Silong — schema fragment.
 *
 *  MERGE INTO your project's `convex/schema.ts`. Spread the exported
 *  `databaseSilongTables` into your `defineSchema(...)` call:
 *
 *  ```ts
 *  // convex/schema.ts
 *  import { defineSchema } from "convex/server";
 *  import { databaseSilongTables } from "./schema.database-silong";
 *
 *  export default defineSchema({
 *    ...databaseSilongTables,
 *    // your other tables here
 *  });
 *  ```
 *
 *  After saving, run `npx convex codegen` to regenerate `_generated/*`.
 *
 *  Required env: NONE (uses Convex's internal user table if @convex-dev/auth
 *  is installed; otherwise see WIRING.md for the auth adapter swap).
 *
 *  Optional env: NEXT_PUBLIC_DB_MOUNT_PATH (defaults to "/db") if you
 *  mount the catch-all route elsewhere.
 */

import { defineTable } from "convex/server";
import { v } from "convex/values";

export const databaseSilongTables = {
  /** Top-level database container. Properties + views + row pointers
   *  live here; per-row values live on the row's `pages` entry under
   *  `rowProps[propId]`. */
  databases: defineTable({
    userId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
    name: v.string(),
    icon: v.string(),
    /** Property schema — see notion-database README for the shape of
     *  each Property: {id, name, type, options?, formulaExpression?,
     *  rollupAggregate?, ...}. Stored as `v.any()` for forward-compat —
     *  property types evolve faster than schema migrations. */
    properties: v.array(v.any()),
    rowIds: v.array(v.id("pages")),
    views: v.array(v.any()),
    activeViewId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    uniqueIdCounter: v.optional(v.number()),
    templates: v.optional(v.array(v.any())),
    defaultTemplateId: v.optional(v.union(v.string(), v.null())),
    subItemsParentPropId: v.optional(v.union(v.string(), v.null())),
    locked: v.optional(v.boolean()),
    trashed: v.optional(v.boolean()),
    /** Denormalised flag — `true` iff any view has `formIsPublic: true`.
     *  Stamped by `databases.update` whenever views[] is patched. Lets
     *  public-form resolution skip a full table scan. */
    hasPublicForm: v.optional(v.boolean()),
  })
    .index("by_user", ["userId"])
    .index("by_workspace", ["workspaceId"])
    .index("by_trashed_updated", ["trashed", "updatedAt"])
    .index("by_has_public_form", ["hasPublicForm"])
    .searchIndex("search_name", {
      searchField: "name",
      filterFields: ["userId", "workspaceId", "trashed"],
    }),

  /** Row pages. Each database row IS a page with `rowOfDatabaseId` set.
   *  This dual nature lets rows have their own block content (the row
   *  detail panel) while their property VALUES live in `rowProps`. */
  pages: defineTable({
    userId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
    parentId: v.optional(v.union(v.id("pages"), v.null())),
    rowOfDatabaseId: v.optional(v.id("databases")),
    /** Per-property values, keyed by property id. Shape varies by
     *  property type — see notion-database's PropertyValue union. */
    rowProps: v.optional(v.any()),
    title: v.string(),
    icon: v.string(),
    cover: v.union(v.string(), v.null()),
    blocks: v.array(v.any()),
    layouts: v.optional(v.array(v.any())),
    favorite: v.boolean(),
    trashed: v.boolean(),
    locked: v.optional(v.boolean()),
    font: v.optional(v.string()),
    smallText: v.optional(v.boolean()),
    fullWidth: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
    /** Public share slug, if shared. */
    publicSlug: v.optional(v.string()),
    /** Per-page sharing grants — see notion-database WIRING.md. */
    grants: v.optional(v.array(v.any())),
  })
    .index("by_user", ["userId"])
    .index("by_workspace", ["workspaceId"])
    .index("by_parent", ["parentId"])
    .index("by_row_of_database", ["rowOfDatabaseId"])
    .index("by_public_slug", ["publicSlug"])
    .index("by_trashed_updated", ["trashed", "updatedAt"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["userId", "workspaceId", "trashed"],
    }),

  /** Optional — multi-workspace tenancy. Drop if single-workspace mode.
   *  Without this table, set `workspaceId` to v.optional() throughout
   *  and the convex queries auto-fall back to single-tenant mode. */
  workspaces: defineTable({
    name: v.string(),
    emoji: v.optional(v.string()),
    ownerId: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_owner", ["ownerId"]),

  /** Optional — multi-workspace membership. Drop if single-workspace. */
  workspaceMembers: defineTable({
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    role: v.string(), // "owner" | "editor" | "viewer"
    joinedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_user", ["userId"])
    .index("by_workspace_user", ["workspaceId", "userId"]),

  /** Optional — per-user profile + active workspace pointer. */
  userProfiles: defineTable({
    userId: v.id("users"),
    activeWorkspaceId: v.optional(v.id("workspaces")),
    displayName: v.optional(v.string()),
    icon: v.optional(v.string()),
    bio: v.optional(v.string()),
    color: v.optional(v.string()),
  }).index("by_user", ["userId"]),
};
