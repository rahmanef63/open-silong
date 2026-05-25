import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";
import { requireAuth } from "./_shared/auth";
import {
  ensurePersonalWorkspace,
  getActiveWorkspaceMutation,
  listMyWorkspaces,
  readActiveWorkspace,
  requireWorkspaceMember,
  slugifyWorkspaceName,
} from "./_shared/workspace";
import { rateLimit } from "./_shared/rateLimit";

const NAME_MAX = 60;

/** Legacy single-workspace query — still used by callers that haven't
 *  migrated to `getActive`. Returns the active workspace doc (or null
 *  for anonymous viewer) in the same shape the old `get` returned
 *  (id/name/emoji visible). */
export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await readActiveWorkspace(ctx, userId);
  },
});

/** Active workspace + viewer's role. Subscribes; switches re-emit. */
export const getActive = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const ws = await readActiveWorkspace(ctx, userId);
    if (!ws) return null;
    const member = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_user_workspace", (q) =>
        q.eq("userId", userId).eq("workspaceId", ws._id),
      )
      .unique();
    return { ...ws, role: member?.role ?? "owner" };
  },
});

/** Every workspace the viewer is a member of. Returns role + isPersonal
 *  flags so the switcher can group / badge them. Anonymous → []. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await listMyWorkspaces(ctx, userId);
  },
});

/** Member roster for one workspace. Owners see emails; non-owners
 *  see names only. Throws if viewer is not a member. */
export const members = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, { workspaceId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const me = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_user_workspace", (q) =>
        q.eq("userId", userId).eq("workspaceId", workspaceId),
      )
      .unique();
    if (!me) return [];
    const rows = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
      .collect();
    return await Promise.all(
      rows.map(async (m) => {
        const u = await ctx.db.get(m.userId);
        return {
          _id: m._id,
          userId: m.userId,
          role: m.role,
          joinedAt: m.joinedAt,
          name: (u?.name as string | undefined) ?? null,
          email: me.role === "owner" ? ((u?.email as string | undefined) ?? null) : null,
        };
      }),
    );
  },
});

/** Legacy upsert — patches the personal workspace's name+emoji.
 *  Idempotent. New code should use `rename` / `setIcon` instead. */
export const upsert = mutation({
  args: { name: v.string(), emoji: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const personal = await ensurePersonalWorkspace(ctx, userId);
    await ctx.db.patch(personal._id, { name: args.name, emoji: args.emoji });
  },
});

/** Create a new (non-personal) workspace; viewer becomes owner. Sets
 *  it as active. Rate-limited via existing `dbCreate` bucket so users
 *  can't spam workspace creation. */
export const create = mutation({
  args: { name: v.string(), emoji: v.optional(v.string()) },
  handler: async (ctx, { name, emoji }) => {
    const userId = await requireAuth(ctx);
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Name required");
    if (trimmed.length > NAME_MAX) throw new Error(`Name too long (max ${NAME_MAX})`);
    await rateLimit(ctx, userId, { scope: "workspace.create", max: 5, windowMs: 60_000 });
    // Ensure personal exists first so the slug pool is correct.
    await ensurePersonalWorkspace(ctx, userId);
    const slugBase = slugifyWorkspaceName(trimmed);
    let slug = slugBase;
    let n = 1;
    while (
      await ctx.db
        .query("workspaces")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .first()
    ) {
      n += 1;
      slug = `${slugBase}-${n}`;
    }
    const id = await ctx.db.insert("workspaces", {
      userId,
      ownerId: userId,
      name: trimmed,
      emoji: emoji ?? "📁",
      slug,
      isPersonal: false,
      createdAt: Date.now(),
    });
    await ctx.db.insert("workspaceMembers", {
      workspaceId: id,
      userId,
      role: "owner",
      joinedAt: Date.now(),
    });
    // Promote to active.
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (profile) await ctx.db.patch(profile._id, { activeWorkspaceId: id });
    return id;
  },
});

export const rename = mutation({
  args: { workspaceId: v.id("workspaces"), name: v.string() },
  handler: async (ctx, { workspaceId, name }) => {
    const { role } = await requireWorkspaceMember(ctx, workspaceId);
    if (role !== "owner") throw new Error("Only owner can rename");
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Name required");
    if (trimmed.length > NAME_MAX) throw new Error(`Name too long (max ${NAME_MAX})`);
    await ctx.db.patch(workspaceId, { name: trimmed });
  },
});

export const setIcon = mutation({
  args: { workspaceId: v.id("workspaces"), emoji: v.string() },
  handler: async (ctx, { workspaceId, emoji }) => {
    const { role } = await requireWorkspaceMember(ctx, workspaceId);
    if (role !== "owner") throw new Error("Only owner can set icon");
    await ctx.db.patch(workspaceId, { emoji });
  },
});

/** Set the workspace's default theme preset + mode. Applied at sign-in
 *  + on workspace activation when the user has no per-workspace local
 *  override. Owner or editor only — viewers consume but don't manage. */
export const setTheme = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    themePresetId: v.optional(v.union(v.string(), v.null())),
    themeMode: v.optional(v.union(
      v.literal("light"), v.literal("dark"), v.literal("system"), v.null(),
    )),
  },
  handler: async (ctx, { workspaceId, themePresetId, themeMode }) => {
    const { role } = await requireWorkspaceMember(ctx, workspaceId);
    if (role !== "owner" && role !== "editor") {
      throw new Error("Only workspace owner or editor can change theme");
    }
    const patch: Record<string, unknown> = {};
    // `null` = explicit clear, `undefined` = leave unchanged
    if (themePresetId !== undefined) {
      patch.themePresetId = themePresetId === null ? undefined : themePresetId;
    }
    if (themeMode !== undefined) {
      patch.themeMode = themeMode === null ? undefined : themeMode;
    }
    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(workspaceId, patch);
    }
  },
});

/** Switch the viewer's active workspace. Throws if not a member. */
export const setActive = mutation({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, { workspaceId }) => {
    const userId = await requireAuth(ctx);
    const member = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_user_workspace", (q) =>
        q.eq("userId", userId).eq("workspaceId", workspaceId),
      )
      .unique();
    if (!member) throw new Error("Not a member");
    let profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!profile) {
      const id = await ctx.db.insert("userProfiles", {
        userId,
        role: "user",
        createdAt: Date.now(),
        activeWorkspaceId: workspaceId,
      });
      profile = (await ctx.db.get(id))!;
    } else {
      await ctx.db.patch(profile._id, { activeWorkspaceId: workspaceId });
    }
  },
});

/** Owner-only delete. Refuses to delete the personal workspace
 *  (would orphan the user). Cascades: removes every member row;
 *  entity rows (pages/databases/...) are NOT deleted in session 1
 *  — they remain and become unreachable from the switcher.
 *  Cleanup of orphaned entities is a session-2 concern. */
export const remove = mutation({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, { workspaceId }) => {
    const { userId, workspace, role } = await requireWorkspaceMember(ctx, workspaceId);
    if (role !== "owner") throw new Error("Only owner can delete");
    if (workspace.isPersonal) throw new Error("Personal workspace cannot be deleted");
    const members = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
      .collect();
    for (const m of members) await ctx.db.delete(m._id);
    await ctx.db.delete(workspaceId);
    // Reset active to personal.
    const personal = await ensurePersonalWorkspace(ctx, userId);
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (profile) await ctx.db.patch(profile._id, { activeWorkspaceId: personal._id });
  },
});

/** Member leaves a workspace. Owner cannot leave their own (must
 *  delete or transfer ownership — transfer ships in session 3). */
export const leave = mutation({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, { workspaceId }) => {
    const { userId, role } = await requireWorkspaceMember(ctx, workspaceId);
    if (role === "owner") throw new Error("Owner cannot leave — delete the workspace instead");
    const member = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_user_workspace", (q) =>
        q.eq("userId", userId).eq("workspaceId", workspaceId),
      )
      .unique();
    if (member) await ctx.db.delete(member._id);
    const personal = await ensurePersonalWorkspace(ctx, userId);
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (profile?.activeWorkspaceId === workspaceId) {
      await ctx.db.patch(profile._id, { activeWorkspaceId: personal._id });
    }
  },
});

/** Idempotent bootstrap — used by the frontend on first authed
 *  load to guarantee `getActive` returns a real workspace. Safe to
 *  call repeatedly; cheap when state is already healthy. */
export const ensureBootstrapped = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    const ws = await getActiveWorkspaceMutation(ctx, userId);
    return ws._id;
  },
});

/** Backfill helper — runs through every entity table the viewer owns
 *  and stamps `workspaceId` = their personal workspace. Limited to
 *  the viewer's own rows; safe to expose. Session 2 will switch new
 *  rows to write workspaceId at insert-time so this becomes a no-op
 *  for anything created post-migration. */
export const backfillMyWorkspaceId = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    const personal = await ensurePersonalWorkspace(ctx, userId);
    const wsId = personal._id;
    const tables: Array<"pages" | "databases" | "snapshots" | "recents" | "notifications" | "files"> = [
      "pages", "databases", "snapshots", "recents", "notifications", "files",
    ];
    let touched = 0;
    for (const t of tables) {
      const rows = await ctx.db
        .query(t)
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      for (const row of rows) {
        if (!(row as { workspaceId?: Id<"workspaces"> }).workspaceId) {
          await ctx.db.patch(row._id, { workspaceId: wsId });
          touched += 1;
        }
      }
    }
    return { workspaceId: wsId, touched };
  },
});
