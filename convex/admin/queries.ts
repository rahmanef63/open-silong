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
    const sharedPages = pages.filter((p) => !p.trashed && (p as { isPublic?: boolean }).isPublic).length;
    let blockCount = 0;
    let rowCount = 0;
    for (const p of pages) {
      if (p.trashed) continue;
      blockCount += Array.isArray((p as { blocks?: unknown[] }).blocks)
        ? ((p as { blocks: unknown[] }).blocks).length
        : 0;
    }
    for (const d of databases) {
      rowCount += Array.isArray((d as { rowIds?: unknown[] }).rowIds)
        ? ((d as { rowIds: unknown[] }).rowIds).length
        : 0;
    }
    const now = Date.now();
    const dayMs = DAY_MS;
    const newUsers24h = users.filter((u) => (u._creationTime ?? 0) > now - dayMs).length;
    const newUsers7d = users.filter((u) => (u._creationTime ?? 0) > now - 7 * dayMs).length;
    const newUsers30d = users.filter((u) => (u._creationTime ?? 0) > now - 30 * dayMs).length;
    const editedPages24h = pages.filter((p) => !p.trashed && (p.updatedAt ?? 0) > now - dayMs).length;
    const editedPages7d = pages.filter((p) => !p.trashed && (p.updatedAt ?? 0) > now - 7 * dayMs).length;
    // Real DAU/WAU/MAU based on userProfiles.lastSeenAt (touched by
    // useTouchLastSeen on the dashboard, debounced ~5min). Falls back
    // to 0 for profiles without the field (rolled out 2026-05-09).
    const dau = profiles.filter((p) => (p.lastSeenAt ?? 0) > now - dayMs).length;
    const wau = profiles.filter((p) => (p.lastSeenAt ?? 0) > now - 7 * dayMs).length;
    const mau = profiles.filter((p) => (p.lastSeenAt ?? 0) > now - 30 * dayMs).length;
    return {
      users: users.length,
      admins: adminCount,
      workspaces: workspaces.length,
      pages: pages.length - trashedPages,
      pagesInTrash: trashedPages,
      pagesShared: sharedPages,
      databases: databases.length,
      blocks: blockCount,
      rows: rowCount,
      files: files.length,
      comments: comments.length,
      notifications: notifications.length,
      newUsers24h,
      newUsers7d,
      newUsers30d,
      editedPages24h,
      editedPages7d,
      dau,
      wau,
      mau,
    };
  },
});

/** Activity per day across last N days. Tracks page creations + edits.
 *  Edits are counted as pages whose updatedAt fell on that day (one per
 *  page per day max). Useful for the "engagement" curve. */
export const getActivityTrend = query({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, { days }) => {
    await requireAdminQuery(ctx);
    const span = Math.max(1, Math.min(90, days ?? 14));
    const now = Date.now();
    const start = now - span * DAY_MS;
    const pages = await ctx.db.query("pages").collect();
    type Bucket = { date: string; created: number; edited: number };
    const buckets: Bucket[] = [];
    for (let i = span - 1; i >= 0; i--) {
      const d = new Date(now - i * DAY_MS);
      buckets.push({ date: d.toISOString().slice(0, 10), created: 0, edited: 0 });
    }
    const map = new Map(buckets.map((b) => [b.date, b]));
    for (const p of pages) {
      const created = (p._creationTime as number | undefined) ?? 0;
      if (created >= start) {
        const k = new Date(created).toISOString().slice(0, 10);
        const b = map.get(k);
        if (b) b.created += 1;
      }
      const updated = (p.updatedAt as number | undefined) ?? 0;
      if (updated >= start && updated !== created) {
        const k = new Date(updated).toISOString().slice(0, 10);
        const b = map.get(k);
        if (b) b.edited += 1;
      }
    }
    return buckets;
  },
});

/** Top users sorted by content volume (pages + databases). Capped. */
export const getTopUsersByContent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    await requireAdminQuery(ctx);
    const cap = Math.max(1, Math.min(50, limit ?? 10));
    const [users, pages, databases] = await Promise.all([
      ctx.db.query("users").collect(),
      ctx.db.query("pages").collect(),
      ctx.db.query("databases").collect(),
    ]);
    const pageCount = new Map<string, number>();
    const dbCount = new Map<string, number>();
    for (const p of pages) {
      if (p.trashed) continue;
      pageCount.set(p.userId, (pageCount.get(p.userId) ?? 0) + 1);
    }
    for (const d of databases) {
      dbCount.set(d.userId, (dbCount.get(d.userId) ?? 0) + 1);
    }
    return users
      .map((u) => ({
        _id: u._id,
        email: (u.email as string | undefined) ?? null,
        name: (u.name as string | undefined) ?? null,
        pageCount: pageCount.get(u._id) ?? 0,
        dbCount: dbCount.get(u._id) ?? 0,
      }))
      .filter((u) => u.pageCount + u.dbCount > 0)
      .sort((a, b) => (b.pageCount + b.dbCount) - (a.pageCount + a.dbCount))
      .slice(0, cap);
  },
});

/** Distribution of role assignments. */
export const getRoleDistribution = query({
  args: {},
  handler: async (ctx) => {
    await requireAdminQuery(ctx);
    const profiles = await ctx.db.query("userProfiles").collect();
    const total = (await ctx.db.query("users").collect()).length;
    const counts = { superadmin: 0, admin: 0, user: 0 };
    for (const p of profiles) counts[p.role as keyof typeof counts] += 1;
    const profiledTotal = counts.superadmin + counts.admin + counts.user;
    counts.user += Math.max(0, total - profiledTotal); // unprofiled users default to "user"
    return counts;
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
    const [allPages, allDatabases] = await Promise.all([
      ctx.db.query("pages").collect(),
      ctx.db.query("databases").collect(),
    ]);
    const pageCountByUser = new Map<string, number>();
    const dbCountByUser = new Map<string, number>();
    const lastEditByUser = new Map<string, number>();
    for (const p of allPages) {
      pageCountByUser.set(p.userId, (pageCountByUser.get(p.userId) ?? 0) + 1);
      const updated = (p.updatedAt as number | undefined) ?? 0;
      const prev = lastEditByUser.get(p.userId) ?? 0;
      if (updated > prev) lastEditByUser.set(p.userId, updated);
    }
    for (const d of allDatabases) {
      dbCountByUser.set(d.userId, (dbCountByUser.get(d.userId) ?? 0) + 1);
    }
    return users.map((u) => ({
      _id: u._id,
      email: (u.email as string | undefined) ?? null,
      name: (u.name as string | undefined) ?? null,
      image: (u.image as string | undefined) ?? null,
      createdAt: u._creationTime as number,
      role: (profileByUser.get(u._id)?.role ?? "user") as "superadmin" | "admin" | "user",
      pageCount: pageCountByUser.get(u._id) ?? 0,
      dbCount: dbCountByUser.get(u._id) ?? 0,
      lastEditAt: lastEditByUser.get(u._id) ?? null,
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
