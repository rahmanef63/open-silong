import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth, requireAdmin, actorEmail } from "../_shared/auth";
import { logAuditEventInternal } from "../admin/mutations";

export const createFeedback = mutation({
  args: {
    kind: v.union(v.literal("bug"), v.literal("idea"), v.literal("praise"), v.literal("other")),
    message: v.string(),
  },
  handler: async (ctx, { kind, message }) => {
    const userId = await requireAuth(ctx);
    const trimmed = message.trim();
    if (!trimmed) throw new Error("Pesan kosong");
    if (trimmed.length > 4000) throw new Error("Pesan terlalu panjang");
    const email = await actorEmail(ctx, userId);
    return await ctx.db.insert("feedbackEntries", {
      userId,
      userEmail: email,
      kind,
      message: trimmed,
      status: "open",
      createdAt: Date.now(),
    });
  },
});

export const markResolved = mutation({
  args: { id: v.id("feedbackEntries"), resolved: v.boolean() },
  handler: async (ctx, { id, resolved }) => {
    const actorId = await requireAdmin(ctx);
    const doc = await ctx.db.get(id);
    if (!doc) throw new Error("Feedback tidak ditemukan");
    await ctx.db.patch(id, {
      status: resolved ? "resolved" : "open",
      resolvedAt: resolved ? Date.now() : undefined,
    });
    await logAuditEventInternal(ctx, actorId, "feedback.resolve", String(id), { resolved });
    return { ok: true };
  },
});
