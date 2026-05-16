import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import { requireOwned } from "../../_shared/auth";
import { Id } from "../../_generated/dataModel";

export const enable = mutation({
  args: {
    pageId: v.id("pages"),
    ownerName: v.string(),
    ownerIcon: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.ownerName.length > 100) throw new Error("Owner name too long");
    const { userId } = await requireOwned(ctx, "pages", args.pageId as Id<"pages">);
    await ctx.db.patch(args.pageId as Id<"pages">, {
      wiki: {
        ownerId: userId,
        ownerName: args.ownerName,
        ownerIcon: args.ownerIcon,
        verified: false,
      },
      updatedAt: Date.now(),
    });
  },
});

export const disable = mutation({
  args: { pageId: v.id("pages") },
  handler: async (ctx, args) => {
    await requireOwned(ctx, "pages", args.pageId as Id<"pages">);
    await ctx.db.patch(args.pageId as Id<"pages">, {
      wiki: undefined,
      updatedAt: Date.now(),
    });
  },
});

export const verify = mutation({
  args: { pageId: v.id("pages"), verified: v.boolean() },
  handler: async (ctx, args) => {
    const { doc: page } = await requireOwned(ctx, "pages", args.pageId as Id<"pages">);
    if (!page.wiki) throw new Error("Wiki not enabled");
    await ctx.db.patch(args.pageId as Id<"pages">, {
      wiki: {
        ...page.wiki,
        verified: args.verified,
        verifiedAt: args.verified ? Date.now() : undefined,
      },
      updatedAt: Date.now(),
    });
  },
});
