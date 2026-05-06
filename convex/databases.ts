import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireAuth, requireOwned } from "./_shared/auth";
import { Id } from "./_generated/dataModel";

const uid = () => Math.random().toString(36).slice(2, 10);

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db.query("databases").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
  },
});

export const trash = mutation({
  args: { dbId: v.string() },
  handler: async (ctx, args) => {
    await requireOwned(ctx, "databases", args.dbId as Id<"databases">);
    await ctx.db.patch(args.dbId as Id<"databases">, { trashed: true, updatedAt: Date.now() });
  },
});

export const restore = mutation({
  args: { dbId: v.string() },
  handler: async (ctx, args) => {
    await requireOwned(ctx, "databases", args.dbId as Id<"databases">);
    await ctx.db.patch(args.dbId as Id<"databases">, { trashed: false, updatedAt: Date.now() });
  },
});

export const permanentlyDelete = mutation({
  args: { dbId: v.string() },
  handler: async (ctx, args) => {
    const { userId, doc: db } = await requireOwned(ctx, "databases", args.dbId as Id<"databases">);
    const rows = await Promise.all(
      db.rowIds.map((rowId) => ctx.db.get(rowId as Id<"pages">)),
    );
    await Promise.all(
      rows
        .filter((r): r is NonNullable<typeof r> => !!r && r.userId === userId)
        .map((r) => ctx.db.delete(r._id)),
    );
    await ctx.db.delete(args.dbId as Id<"databases">);
  },
});

export const create = mutation({
  args: { name: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
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
    await requireOwned(ctx, "databases", args.dbId as Id<"databases">);
    await ctx.db.patch(args.dbId as Id<"databases">, { ...args.patch, updatedAt: Date.now() });
  },
});

export const addRow = mutation({
  args: { dbId: v.string(), init: v.optional(v.any()), templateId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { userId, doc: db } = await requireOwned(ctx, "databases", args.dbId as Id<"databases">);
    const now = Date.now();

    const uniqueIdProps: { id: string; prefix?: string }[] = (db.properties ?? [])
      .filter((p: any) => p.type === "unique_id")
      .map((p: any) => ({ id: p.id, prefix: p.uniqueIdPrefix }));
    let counter = db.uniqueIdCounter ?? 0;

    const templates = (db as any).templates as any[] | undefined;
    const tplId = args.templateId ?? db.defaultTemplateId ?? null;
    const tpl = tplId ? templates?.find((t) => t.id === tplId) : undefined;

    const seedRowProps: Record<string, any> = {
      ...((tpl?.rowProps as any) ?? {}),
      ...(((args.init ?? {}).rowProps as any) ?? {}),
    };
    for (const u of uniqueIdProps) {
      counter += 1;
      seedRowProps[u.id] = u.prefix ? `${u.prefix}-${counter}` : String(counter);
    }

    const init = { ...(args.init ?? {}) };
    delete (init as any).rowProps;

    const seedBlocks = tpl?.blocks?.length
      ? tpl.blocks.map((b: any) => ({ ...b, id: uid() }))
      : [{ id: uid(), type: "paragraph", text: "" }];

    const rowId = await ctx.db.insert("pages", {
      userId,
      parentId: null,
      title: "",
      icon: tpl?.icon ?? "📄",
      cover: null,
      blocks: seedBlocks,
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
    const { doc: db } = await requireOwned(ctx, "databases", args.dbId as Id<"databases">);
    await requireOwned(ctx, "pages", args.rowPageId as Id<"pages">);
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
    const { doc: page } = await requireOwned(ctx, "pages", args.rowPageId as Id<"pages">);
    const rowProps = { ...(page.rowProps ?? {}), [args.propId]: args.value };
    await ctx.db.patch(args.rowPageId as Id<"pages">, { rowProps, updatedAt: Date.now() });
  },
});
