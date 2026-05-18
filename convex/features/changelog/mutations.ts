import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import { requireAdmin, requireAuth } from "../../_shared/auth";
import { Id } from "../../_generated/dataModel";

const itemValidator = v.object({
  text: v.string(),
  kind: v.optional(v.union(
    v.literal("feature"),
    v.literal("fix"),
    v.literal("improvement"),
    v.literal("breaking"),
  )),
});

export const create = mutation({
  args: {
    version: v.string(),
    title: v.string(),
    items: v.array(itemValidator),
    body: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const now = Date.now();
    return await ctx.db.insert("changelogEntries", {
      version: args.version.slice(0, 40),
      title: args.title.slice(0, 200),
      items: args.items.slice(0, 50).map((i) => ({ text: i.text.slice(0, 300), kind: i.kind })),
      body: args.body?.slice(0, 5000),
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("changelogEntries"),
    version: v.optional(v.string()),
    title: v.optional(v.string()),
    items: v.optional(v.array(itemValidator)),
    body: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const entry = await ctx.db.get(args.id);
    if (!entry) throw new Error("Changelog entry not found");
    await ctx.db.patch(args.id, {
      ...(args.version !== undefined ? { version: args.version.slice(0, 40) } : {}),
      ...(args.title !== undefined ? { title: args.title.slice(0, 200) } : {}),
      ...(args.items !== undefined ? {
        items: args.items.slice(0, 50).map((i) => ({ text: i.text.slice(0, 300), kind: i.kind })),
      } : {}),
      ...(args.body !== undefined ? { body: args.body.slice(0, 5000) } : {}),
      updatedAt: Date.now(),
    });
  },
});

export const publish = mutation({
  args: { id: v.id("changelogEntries") },
  handler: async (ctx, args) => {
    const adminId = await requireAdmin(ctx);
    const entry = await ctx.db.get(args.id);
    if (!entry) throw new Error("Changelog entry not found");
    await ctx.db.patch(args.id, {
      publishedAt: Date.now(),
      publishedBy: adminId,
      updatedAt: Date.now(),
    });
  },
});

export const unpublish = mutation({
  args: { id: v.id("changelogEntries") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.id, {
      publishedAt: undefined,
      publishedBy: undefined,
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("changelogEntries") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.id);
  },
});

/** Mark the viewer caught-up to the most recent published entry.
 *  Stores epoch ms on userProfiles.lastReadChangelogAt. */
export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    const now = Date.now();
    if (profile) {
      await ctx.db.patch(profile._id, { lastReadChangelogAt: now });
      return;
    }
    // Defensive: create a stub profile so the timestamp persists.
    await ctx.db.insert("userProfiles", {
      userId: userId as Id<"users">,
      role: "user",
      createdAt: now,
      lastReadChangelogAt: now,
    });
  },
});
