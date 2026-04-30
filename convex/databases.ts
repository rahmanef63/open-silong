import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

const uid = () => Math.random().toString(36).slice(2, 10);

export const list = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db.query("databases").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
  },
});

export const create = mutation({
  args: { name: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const now = Date.now();
    const titleProp = { id: uid(), name: "Name", type: "text" };
    const statusProp = {
      id: uid(), name: "Status", type: "status",
      options: [
        { id: uid(), name: "Not started", color: "gray" },
        { id: uid(), name: "In progress", color: "blue" },
        { id: uid(), name: "Done", color: "green" },
      ],
    };
    const view = { id: uid(), name: "Table", type: "table", sorts: [], filters: [], search: "" };
    return await ctx.db.insert("databases", {
      userId,
      name: args.name ?? "Untitled database",
      icon: "🗂️",
      properties: [titleProp, statusProp],
      rowIds: [],
      views: [view],
      activeViewId: view.id,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: { dbId: v.string(), patch: v.any() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const db = await ctx.db.get(args.dbId as Id<"databases">);
    if (!db || db.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(args.dbId as Id<"databases">, { ...args.patch, updatedAt: Date.now() });
  },
});

export const addRow = mutation({
  args: { dbId: v.string(), init: v.optional(v.any()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const now = Date.now();
    const db = await ctx.db.get(args.dbId as Id<"databases">);
    if (!db || db.userId !== userId) throw new Error("Database not found");

    const uniqueIdProps: { id: string; prefix?: string }[] = (db.properties ?? [])
      .filter((p: any) => p.type === "unique_id")
      .map((p: any) => ({ id: p.id, prefix: p.uniqueIdPrefix }));
    let counter = db.uniqueIdCounter ?? 0;
    const seedRowProps: Record<string, any> = { ...((args.init ?? {}).rowProps ?? {}) };
    for (const u of uniqueIdProps) {
      counter += 1;
      seedRowProps[u.id] = u.prefix ? `${u.prefix}-${counter}` : String(counter);
    }

    const init = { ...(args.init ?? {}) };
    delete (init as any).rowProps;

    const rowId = await ctx.db.insert("pages", {
      userId,
      parentId: null,
      title: "",
      icon: "📄",
      cover: null,
      blocks: [{ id: uid(), type: "paragraph", text: "" }],
      favorite: false,
      trashed: false,
      rowOfDatabaseId: args.dbId,
      rowProps: seedRowProps,
      createdAt: now,
      updatedAt: now,
      ...init,
    });
    await ctx.db.patch(args.dbId as Id<"databases">, {
      rowIds: [...db.rowIds, rowId],
      uniqueIdCounter: counter,
      updatedAt: now,
    });
    return rowId;
  },
});

export const deleteRow = mutation({
  args: { dbId: v.string(), rowPageId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const db = await ctx.db.get(args.dbId as Id<"databases">);
    if (!db || db.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(args.rowPageId as Id<"pages">, { trashed: true, updatedAt: Date.now() });
    await ctx.db.patch(args.dbId as Id<"databases">, {
      rowIds: db.rowIds.filter((r: string) => r !== args.rowPageId),
      updatedAt: Date.now(),
    });
  },
});

export const setRowValue = mutation({
  args: { dbId: v.string(), rowPageId: v.string(), propId: v.string(), value: v.any() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const page = await ctx.db.get(args.rowPageId as Id<"pages">);
    if (!page || page.userId !== userId) throw new Error("Not found");
    const rowProps = { ...(page.rowProps ?? {}), [args.propId]: args.value };
    await ctx.db.patch(args.rowPageId as Id<"pages">, { rowProps, updatedAt: Date.now() });
  },
});
