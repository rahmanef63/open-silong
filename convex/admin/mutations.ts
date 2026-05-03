import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAdmin, ensureUserProfile, actorEmail, requireAuth } from "../_shared/auth";
import type { Id } from "../_generated/dataModel";

/** Idempotent: client calls on app mount once. Creates profile if missing
 *  + auto-promotes via ADMIN_BOOTSTRAP_EMAILS. Safe for any signed-in user. */
export const bootstrapMyProfile = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    const profile = await ensureUserProfile(ctx, userId);
    return { role: profile.role, signedIn: true };
  },
});

export const setUserRole = mutation({
  args: {
    targetUserId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("user")),
  },
  handler: async (ctx, { targetUserId, role }) => {
    const actorId = await requireAdmin(ctx);
    if (targetUserId === actorId && role !== "admin") {
      throw new Error("Tidak bisa demote diri sendiri");
    }
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", targetUserId))
      .unique();
    const now = Date.now();
    if (profile) {
      await ctx.db.patch(profile._id, { role });
    } else {
      await ctx.db.insert("userProfiles", { userId: targetUserId, role, createdAt: now });
    }
    await logAuditEventInternal(ctx, actorId, "role.set", String(targetUserId), { role });
    return { ok: true };
  },
});

async function logAuditEventInternal(
  ctx: any,
  actorId: Id<"users">,
  kind: string,
  target: string | undefined,
  meta: Record<string, unknown> | undefined,
) {
  const email = await actorEmail(ctx, actorId);
  await ctx.db.insert("auditLog", {
    actorId,
    actorEmail: email,
    kind,
    target,
    meta,
    createdAt: Date.now(),
  });
}

/** Generic audit logger callable from other mutations. Not exposed to client. */
export const logAuditEvent = mutation({
  args: {
    kind: v.string(),
    target: v.optional(v.string()),
    meta: v.optional(v.any()),
  },
  handler: async (ctx, { kind, target, meta }) => {
    const actorId = await requireAdmin(ctx);
    await logAuditEventInternal(ctx, actorId, kind, target, meta);
    return { ok: true };
  },
});

export { logAuditEventInternal };
