import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";
import { buildSearchText } from "./features/search/lib";

const uid = () => Math.random().toString(36).slice(2, 10);

function emptyBlock() {
  return { id: uid(), type: "paragraph", text: "" };
}

/**
 * Anonymous-readable public share. Returns a DTO (no userId, searchText,
 * rowProps, rowOfDatabaseId) only when isPublic && !trashed. Returns null
 * otherwise — caller renders not-found.
 */
export const getPublicShare = query({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    let doc;
    try {
      doc = await ctx.db.get(id as Id<"pages">);
    } catch {
      return null;
    }
    if (!doc || doc.trashed || !doc.isPublic) return null;
    return {
      _id: doc._id,
      title: doc.title,
      icon: doc.icon,
      cover: doc.cover,
      blocks: doc.blocks,
      font: doc.font,
      smallText: doc.smallText,
      fullWidth: doc.fullWidth,
      updatedAt: doc.updatedAt,
    };
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db.query("pages").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
  },
});

/** Slim DTO for sidebar/dashboard/list views. Excludes `blocks`,
 *  `searchText`, `rowProps` — those are 95% of the payload and only the
 *  active page editor needs them. Use `pages.getById(id)` for the full doc.
 *  Cuts websocket payload per keystroke from O(all-pages × blocks) to O(meta). */
export const listMeta = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const docs = await ctx.db
      .query("pages")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return docs.map((d) => ({
      _id: d._id,
      _creationTime: d._creationTime,
      userId: d.userId,
      parentId: d.parentId,
      title: d.title,
      icon: d.icon,
      cover: d.cover,
      favorite: d.favorite,
      trashed: d.trashed,
      isPublic: d.isPublic,
      rowOfDatabaseId: d.rowOfDatabaseId,
      font: d.font,
      smallText: d.smallText,
      fullWidth: d.fullWidth,
      locked: d.locked,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
      /** Cheap derived signal: does this page host any database block?
       *  Used by callers that need to find a database's host page without
       *  scanning all blocks of all pages. */
      databaseHostFor: (d.blocks as any[])
        .filter((b) => b?.type === "database" && b?.databaseId)
        .map((b) => b.databaseId as string),
      /** Block count for cheap previews. */
      blockCount: (d.blocks as any[]).length,
      /** First text-bearing block, truncated. Lets dashboard show snippets
       *  without shipping the full blocks array. */
      previewText: (() => {
        for (const b of d.blocks as any[]) {
          if (typeof b?.text === "string" && b.text.trim()) return b.text.slice(0, 120);
        }
        return "";
      })(),
    }));
  },
});

/** Full page doc for the editor. Subscribe to a single page so block edits
 *  on this page don't re-broadcast all other pages. */
export const getById = query({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    let doc;
    try {
      doc = await ctx.db.get(id as Id<"pages">);
    } catch {
      return null;
    }
    if (!doc || doc.userId !== userId) return null;
    return doc;
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

/**
 * Page content patch. Whitelisted fields only — userId / isPublic / trashed
 * / rowOfDatabaseId / createdAt cannot be flipped via this mutation. Use
 * setPublic / trash / restore for those state transitions.
 */
export const update = mutation({
  args: {
    pageId: v.string(),
    patch: v.object({
      title: v.optional(v.string()),
      icon: v.optional(v.string()),
      cover: v.optional(v.union(v.string(), v.null())),
      blocks: v.optional(v.array(v.any())),
      favorite: v.optional(v.boolean()),
      parentId: v.optional(v.union(v.string(), v.null())),
      font: v.optional(v.string()),
      smallText: v.optional(v.boolean()),
      fullWidth: v.optional(v.boolean()),
      locked: v.optional(v.boolean()),
      rowProps: v.optional(v.any()),
      // Manual sort uses createdAt as the order key; reorder undo restores it.
      createdAt: v.optional(v.number()),
    }),
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

/** Toggle public-share status. Carved out of update() so the public flip
 *  cannot piggyback on a routine content patch. */
export const setPublic = mutation({
  args: { pageId: v.string(), isPublic: v.boolean() },
  handler: async (ctx, { pageId, isPublic }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const page = await ctx.db.get(pageId as Id<"pages">);
    if (!page || page.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(pageId as Id<"pages">, { isPublic, updatedAt: Date.now() });
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
    // Only rebuild searchText when the patch touches text-bearing fields.
    // Toggle/reorder/style-only patches skip the O(blocks) string build.
    const TEXT_FIELDS = ["text", "type", "lang", "caption"];
    const touchesText = Object.keys(args.patch ?? {}).some((k) => TEXT_FIELDS.includes(k));
    await ctx.db.patch(args.pageId as Id<"pages">, {
      blocks,
      ...(touchesText ? { searchText: buildSearchText(page.title, blocks) } : {}),
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
