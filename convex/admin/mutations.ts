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
    // Seed user.name from email local-part when name missing — user can edit later.
    const user = await ctx.db.get(userId);
    if (user) {
      const name = (user.name as string | undefined)?.trim();
      const email = (user.email as string | undefined)?.trim();
      if (!name && email) {
        await ctx.db.patch(userId, { name: email.split("@")[0] });
      }
    }
    return { role: profile.role, signedIn: true };
  },
});

/** First-deployer escape hatch — promote the caller to "superadmin"
 *  ONLY if no superadmin exists yet anywhere. Race-safe: the unique
 *  superadmin invariant is guarded by a re-query inside the mutation
 *  body (Convex serializes mutations on the same workspace).
 *
 *  This is intended for fresh self-hosted deployments where the
 *  operator hasn't set `SUPER_ADMIN_EMAIL` env var. After the first
 *  claim succeeds, subsequent calls throw and the operator should use
 *  `setUserRole` from inside the admin panel for further changes. */
export const claimSuperAdmin = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    // Demo guests (Anonymous provider) can never own the instance —
    // otherwise the first drive-by visitor claims the showcase deploy.
    const me = await ctx.db.get(userId);
    if (me?.isAnonymous) {
      throw new Error("Akun tamu tidak bisa klaim — daftar dengan email dulu.");
    }
    // Cheap O(log n) probe via by_role — no full-table scan even on a
    // freshly-deployed instance. After the first claim, the if-throw fires
    // and the path stops being hit anyway.
    const existingSuperadmin = await ctx.db
      .query("userProfiles")
      .withIndex("by_role", (q) => q.eq("role", "superadmin"))
      .first();
    if (existingSuperadmin) {
      throw new Error("Superadmin already claimed — ask the existing superadmin to grant you a role.");
    }
    const existing = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { role: "superadmin" });
    } else {
      await ctx.db.insert("userProfiles", {
        userId,
        role: "superadmin",
        createdAt: Date.now(),
      });
    }
    const email = await actorEmail(ctx, userId);
    // Audit trail — surfaces in Admin → Audit log immediately.
    await logAuditEventInternal(ctx, userId, "superadmin.claim", String(userId), { email });
    return { role: "superadmin" as const };
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
    if (profile?.role === "superadmin") {
      throw new Error("Tidak bisa mengubah role superadmin");
    }
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

export { logAuditEventInternal };
