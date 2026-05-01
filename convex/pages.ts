import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";
import { buildSearchText } from "./features/search/lib";

const uid = () => Math.random().toString(36).slice(2, 10);

function emptyBlock() {
  return { id: uid(), type: "paragraph", text: "" };
}

export const list = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db.query("pages").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
  },
});

export const create = mutation({
  args: {
    parentId: v.union(v.string(), v.null()),
    title: v.optional(v.string()),
    icon: v.optional(v.string()),
    rowOfDatabaseId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const now = Date.now();
    const blocks = [emptyBlock()];
    return await ctx.db.insert("pages", {
      userId,
      parentId: args.parentId,
      title: args.title ?? "",
      icon: args.icon ?? "📄",
      cover: null,
      blocks,
      favorite: false,
      trashed: false,
      isPublic: false,
      rowOfDatabaseId: args.rowOfDatabaseId,
      rowProps: args.rowOfDatabaseId ? {} : undefined,
      searchText: buildSearchText(args.title, blocks),
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    pageId: v.string(),
    patch: v.any(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const page = await ctx.db.get(args.pageId as Id<"pages">);
    if (!page || page.userId !== userId) throw new Error("Not found");
    const nextTitle = args.patch.title ?? page.title;
    const nextBlocks = args.patch.blocks ?? page.blocks;
    const touchesContent = "title" in args.patch || "blocks" in args.patch;
    await ctx.db.patch(args.pageId as Id<"pages">, {
      ...args.patch,
      ...(touchesContent ? { searchText: buildSearchText(nextTitle, nextBlocks) } : {}),
      updatedAt: Date.now(),
    });
  },
});

export const trash = mutation({
  args: { pageId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const allPages = await ctx.db.query("pages").withIndex("by_user", (q) => q.eq("userId", userId)).collect();

    const collectDescendants = (id: string): string[] => {
      const out = [id];
      const kids = allPages.filter((p) => p.parentId === id);
      for (const k of kids) out.push(...collectDescendants(k._id));
      return out;
    };

    const ids = collectDescendants(args.pageId);
    const now = Date.now();
    for (const id of ids) {
      await ctx.db.patch(id as Id<"pages">, { trashed: true, updatedAt: now });
    }
  },
});

export const restore = mutation({
  args: { pageId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const allPages = await ctx.db.query("pages").withIndex("by_user", (q) => q.eq("userId", userId)).collect();

    const collectDescendants = (id: string): string[] => {
      const out = [id];
      const kids = allPages.filter((p) => p.parentId === id);
      for (const k of kids) out.push(...collectDescendants(k._id));
      return out;
    };

    const ids = collectDescendants(args.pageId);
    for (const id of ids) {
      await ctx.db.patch(id as Id<"pages">, { trashed: false });
    }
  },
});

export const permanentlyDelete = mutation({
  args: { pageId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const allPages = await ctx.db.query("pages").withIndex("by_user", (q) => q.eq("userId", userId)).collect();

    const collectDescendants = (id: string): string[] => {
      const out = [id];
      const kids = allPages.filter((p) => p.parentId === id);
      for (const k of kids) out.push(...collectDescendants(k._id));
      return out;
    };

    const ids = collectDescendants(args.pageId);
    for (const id of ids) {
      const snaps = await ctx.db.query("snapshots").withIndex("by_user_page", (q) => q.eq("userId", userId).eq("pageId", id)).collect();
      for (const s of snaps) await ctx.db.delete(s._id);
      await ctx.db.delete(id as Id<"pages">);
    }
  },
});

export const duplicate = mutation({
  args: { pageId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const src = await ctx.db.get(args.pageId as Id<"pages">);
    if (!src || src.userId !== userId) throw new Error("Not found");
    const now = Date.now();
    const blocks = JSON.parse(JSON.stringify(src.blocks)).map((b: any) => ({ ...b, id: uid() }));
    const title = src.title ? `${src.title} (copy)` : "";
    return await ctx.db.insert("pages", {
      userId,
      parentId: src.parentId,
      title,
      icon: src.icon,
      cover: src.cover,
      blocks,
      favorite: false,
      trashed: false,
      isPublic: src.isPublic,
      rowOfDatabaseId: src.rowOfDatabaseId,
      rowProps: src.rowProps ? JSON.parse(JSON.stringify(src.rowProps)) : undefined,
      searchText: buildSearchText(title, blocks),
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const addBlock = mutation({
  args: {
    pageId: v.string(),
    afterIndex: v.number(),
    type: v.optional(v.string()),
    init: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const page = await ctx.db.get(args.pageId as Id<"pages">);
    if (!page || page.userId !== userId) throw new Error("Not found");
    const newId = uid();
    const blocks = [...page.blocks];
    blocks.splice(args.afterIndex + 1, 0, {
      id: newId,
      type: args.type ?? "paragraph",
      text: "",
      checked: args.type === "todo" ? false : undefined,
      ...(args.init ?? {}),
    });
    await ctx.db.patch(args.pageId as Id<"pages">, {
      blocks,
      searchText: buildSearchText(page.title, blocks),
      updatedAt: Date.now(),
    });
    return newId;
  },
});

export const updateBlock = mutation({
  args: { pageId: v.string(), blockId: v.string(), patch: v.any() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const page = await ctx.db.get(args.pageId as Id<"pages">);
    if (!page || page.userId !== userId) throw new Error("Not found");
    const blocks = page.blocks.map((b: any) =>
      b.id === args.blockId ? { ...b, ...args.patch } : b
    );
    await ctx.db.patch(args.pageId as Id<"pages">, {
      blocks,
      searchText: buildSearchText(page.title, blocks),
      updatedAt: Date.now(),
    });
  },
});

export const deleteBlock = mutation({
  args: { pageId: v.string(), blockId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const page = await ctx.db.get(args.pageId as Id<"pages">);
    if (!page || page.userId !== userId) throw new Error("Not found");
    let blocks = page.blocks.filter((b: any) => b.id !== args.blockId);
    if (!blocks.length) blocks = [emptyBlock()];
    await ctx.db.patch(args.pageId as Id<"pages">, {
      blocks,
      searchText: buildSearchText(page.title, blocks),
      updatedAt: Date.now(),
    });
  },
});

export const reorderBlocks = mutation({
  args: { pageId: v.string(), orderedIds: v.array(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const page = await ctx.db.get(args.pageId as Id<"pages">);
    if (!page || page.userId !== userId) throw new Error("Not found");
    const map = new Map(page.blocks.map((b: any) => [b.id, b]));
    const blocks = args.orderedIds.map((id) => map.get(id)).filter(Boolean);
    await ctx.db.patch(args.pageId as Id<"pages">, {
      blocks,
      // searchText unchanged — reorder doesn't change set of words
      updatedAt: Date.now(),
    });
  },
});
