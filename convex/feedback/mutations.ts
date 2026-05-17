import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth, requireAdmin, actorEmail } from "../_shared/auth";
import { logAuditEventInternal } from "../admin/mutations";

const KIND = v.union(v.literal("bug"), v.literal("idea"), v.literal("praise"), v.literal("other"));
const PRIORITY = v.union(v.literal("low"), v.literal("med"), v.literal("high"));
const STATUS = v.union(
  v.literal("open"),
  v.literal("in_review"),
  v.literal("resolved"),
  v.literal("closed"),
);

export const createFeedback = mutation({
  args: {
    kind: KIND,
    title: v.optional(v.string()),
    message: v.string(),
    priority: v.optional(PRIORITY),
  },
  handler: async (ctx, { kind, title, message, priority }) => {
    const userId = await requireAuth(ctx);
    const trimmed = message.trim();
    if (!trimmed) throw new Error("Pesan kosong");
    if (trimmed.length > 4000) throw new Error("Pesan terlalu panjang");
    const cleanTitle = title?.trim();
    if (cleanTitle && cleanTitle.length > 160) throw new Error("Judul terlalu panjang");
    const email = await actorEmail(ctx, userId);
    return await ctx.db.insert("feedbackEntries", {
      userId,
      userEmail: email,
      kind,
      title: cleanTitle || undefined,
      message: trimmed,
      priority,
      status: "open",
      createdAt: Date.now(),
    });
  },
});

/** Legacy admin endpoint — kept so existing UI keeps working. Prefer
 *  `setStatus` below which supports the full four-state flow. */
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

/** Admin: set any of the four states. Stamps resolvedAt when moving
 *  to `resolved` / `closed`. */
export const setStatus = mutation({
  args: { id: v.id("feedbackEntries"), status: STATUS },
  handler: async (ctx, { id, status }) => {
    const actorId = await requireAdmin(ctx);
    const doc = await ctx.db.get(id);
    if (!doc) throw new Error("Ticket tidak ditemukan");
    const terminal = status === "resolved" || status === "closed";
    await ctx.db.patch(id, {
      status,
      resolvedAt: terminal ? Date.now() : undefined,
    });
    await logAuditEventInternal(ctx, actorId, "feedback.status", String(id), { status });
    return { ok: true };
  },
});

/** Admin: post a reply visible to the reporter. Empty string clears
 *  the existing reply. Optional status transition lets the admin
 *  reply + close in one click. */
export const replyToFeedback = mutation({
  args: {
    id: v.id("feedbackEntries"),
    reply: v.string(),
    nextStatus: v.optional(STATUS),
  },
  handler: async (ctx, { id, reply, nextStatus }) => {
    const actorId = await requireAdmin(ctx);
    const doc = await ctx.db.get(id);
    if (!doc) throw new Error("Ticket tidak ditemukan");
    const trimmed = reply.trim();
    if (trimmed.length > 8000) throw new Error("Balasan terlalu panjang");
    const patch: Record<string, unknown> = {
      adminReply: trimmed || undefined,
      repliedAt: trimmed ? Date.now() : undefined,
      repliedBy: trimmed ? actorId : undefined,
    };
    if (nextStatus) {
      patch.status = nextStatus;
      const terminal = nextStatus === "resolved" || nextStatus === "closed";
      patch.resolvedAt = terminal ? Date.now() : undefined;
    }
    await ctx.db.patch(id, patch);
    await logAuditEventInternal(ctx, actorId, "feedback.reply", String(id), {
      replyLen: trimmed.length,
      nextStatus,
    });
    return { ok: true };
  },
});
