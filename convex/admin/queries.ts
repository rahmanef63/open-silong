import { query } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireAdminQuery } from "../_shared/auth";

const DAY_MS = 86_400_000;

/** Read-only: returns role for the current user, or "user" if not bootstrapped /
 *  not signed in. Used by frontend to gate the Admin nav entry.
 *
 *  `claimableSuperAdmin` indicates the workspace has NO superadmin yet —
 *  the signed-in user can claim it via `mutations.claimSuperAdmin`. This
 *  is the bootstrap escape hatch for fresh deployments where the deployer
 *  hasn't set `SUPER_ADMIN_EMAIL` env var. */
export const getMyRole = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { role: "user" as const, signedIn: false, claimableSuperAdmin: false };
    }
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    const role = (profile?.role ?? "user") as "superadmin" | "admin" | "user";
    const allProfiles = await ctx.db.query("userProfiles").collect();
    const hasSuperAdmin = allProfiles.some((p) => p.role === "superadmin");
    return {
      role,
      signedIn: true,
      claimableSuperAdmin: !hasSuperAdmin && role !== "superadmin",
    };
  },
});

export const getOverview = query({
  args: {},
  handler: async (ctx) => {
    await requireAdminQuery(ctx);
    const [users, profiles, workspaces, pages, databases, files, comments, notifications] =
      await Promise.all([
        ctx.db.query("users").collect(),
        ctx.db.query("userProfiles").collect(),
        ctx.db.query("workspaces").collect(),
        ctx.db.query("pages").collect(),
        ctx.db.query("databases").collect(),
        ctx.db.query("files").collect(),
        ctx.db.query("comments").collect(),
        ctx.db.query("notifications").collect(),
      ]);
    const trashedPages = pages.filter((p) => p.trashed).length;
    const adminCount = profiles.filter((p) => p.role === "admin" || p.role === "superadmin").length;
    return {
      users: users.length,
      admins: adminCount,
      workspaces: workspaces.length,
      pages: pages.length - trashedPages,
      pagesInTrash: trashedPages,
      databases: databases.length,
      files: files.length,
      comments: comments.length,
      notifications: notifications.length,
    };
  },
});

export const getSignupTrend = query({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, { days }) => {
    await requireAdminQuery(ctx);
    const span = Math.max(1, Math.min(90, days ?? 14));
    const now = Date.now();
    const start = now - span * DAY_MS;
    const users = await ctx.db.query("users").collect();
    const buckets: { date: string; count: number }[] = [];
    for (let i = span - 1; i >= 0; i--) {
      const d = new Date(now - i * DAY_MS);
      const key = d.toISOString().slice(0, 10);
      buckets.push({ date: key, count: 0 });
    }
    const map = new Map(buckets.map((b) => [b.date, b]));
    for (const u of users) {
      const t = (u._creationTime as number | undefined) ?? 0;
      if (t < start) continue;
      const key = new Date(t).toISOString().slice(0, 10);
      const b = map.get(key);
      if (b) b.count += 1;
    }
    return buckets;
  },
});

export const listUsersWithProfiles = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    await requireAdminQuery(ctx);
    const cap = Math.max(1, Math.min(500, limit ?? 200));
    const users = await ctx.db.query("users").take(cap);
    const profiles = await ctx.db.query("userProfiles").collect();
    const profileByUser = new Map(profiles.map((p) => [p.userId, p]));
    const allPages = await ctx.db.query("pages").collect();
    const pageCountByUser = new Map<string, number>();
    for (const p of allPages) {
      pageCountByUser.set(p.userId, (pageCountByUser.get(p.userId) ?? 0) + 1);
    }
    return users.map((u) => ({
      _id: u._id,
      email: (u.email as string | undefined) ?? null,
      name: (u.name as string | undefined) ?? null,
      createdAt: u._creationTime as number,
      role: (profileByUser.get(u._id)?.role ?? "user") as "superadmin" | "admin" | "user",
      pageCount: pageCountByUser.get(u._id) ?? 0,
    }));
  },
});

export const listAuditLog = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    await requireAdminQuery(ctx);
    const cap = Math.max(1, Math.min(500, limit ?? 100));
    return await ctx.db
      .query("auditLog")
      .withIndex("by_created")
      .order("desc")
      .take(cap);
  },
});
