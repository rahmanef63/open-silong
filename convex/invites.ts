import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireAuth } from "./_shared/auth";
import { ensurePersonalWorkspace, requireWorkspaceMember } from "./_shared/workspace";
import { rateLimit } from "./_shared/rateLimit";
import { COUNT_CAPS } from "./_shared/limits";
import { toBase64Url } from "./_shared/encoding";

const EXPIRY_MS = 14 * 24 * 60 * 60 * 1000;

/** Generates a base64url string (24 bytes → 32 chars). Web Crypto only;
 *  Convex V8 isolate has no Node `Buffer`. */
function randomCode(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

/** Owner-only — mints a new single-use invite. Returns the code so the
 *  caller can compose the share URL client-side
 *  (`/dashboard/invite/<code>`). Rate-limited to keep the table small. */
export const create = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    role: v.union(v.literal("editor"), v.literal("viewer")),
  },
  handler: async (ctx, { workspaceId, role }) => {
    const { userId, role: viewerRole } = await requireWorkspaceMember(ctx, workspaceId);
    if (viewerRole !== "owner") throw new Error("Only owner can invite");
    await rateLimit(ctx, userId, { scope: "invites.create", max: 30, windowMs: 60_000 });
    const code = randomCode();
    const id = await ctx.db.insert("workspaceInvites", {
      workspaceId,
      code,
      role,
      invitedBy: userId,
      createdAt: Date.now(),
    });
    return { id, code };
  },
});

/** Look up an invite by code without consuming it. Returns the
 *  workspace name + role + acceptance state so the accept page can
 *  render a preview. Anonymous-readable so the invite link works
 *  before login (the user signs in, then accepts). */
export const lookup = query({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const inv = await ctx.db
      .query("workspaceInvites")
      .withIndex("by_code", (q) => q.eq("code", code))
      .unique();
    if (!inv) return { status: "missing" as const };
    if (inv.acceptedAt) return { status: "used" as const };
    if (Date.now() - inv.createdAt > EXPIRY_MS) return { status: "expired" as const };
    const ws = await ctx.db.get(inv.workspaceId);
    if (!ws) return { status: "missing" as const };
    return {
      status: "ok" as const,
      workspaceName: ws.name,
      workspaceEmoji: ws.emoji,
      role: inv.role,
    };
  },
});

/** Accept an invite. Idempotent for the same user (no-op when already a
 *  member, marks acceptedAt anyway). Throws on missing/expired/used.
 *  Switches the active workspace to the joined one. */
export const accept = mutation({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const userId = await requireAuth(ctx);
    const inv = await ctx.db
      .query("workspaceInvites")
      .withIndex("by_code", (q) => q.eq("code", code))
      .unique();
    if (!inv) throw new Error("Invite not found");
    if (inv.acceptedAt) throw new Error("Invite already used");
    if (Date.now() - inv.createdAt > EXPIRY_MS) throw new Error("Invite expired");

    // Idempotent membership.
    const existing = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_user_workspace", (q) =>
        q.eq("userId", userId).eq("workspaceId", inv.workspaceId),
      )
      .unique();
    if (!existing) {
      await ctx.db.insert("workspaceMembers", {
        workspaceId: inv.workspaceId,
        userId,
        role: inv.role,
        invitedBy: inv.invitedBy,
        joinedAt: Date.now(),
      });
    }

    await ctx.db.patch(inv._id, { acceptedAt: Date.now(), acceptedBy: userId });

    // Promote to active.
    let profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!profile) {
      // Bootstrap profile + personal first to satisfy invariants.
      await ensurePersonalWorkspace(ctx, userId);
      profile = await ctx.db
        .query("userProfiles")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .unique();
    }
    if (profile) await ctx.db.patch(profile._id, { activeWorkspaceId: inv.workspaceId });
    return { workspaceId: inv.workspaceId };
  },
});

/** Owner-only — revoke an unaccepted invite. */
export const revoke = mutation({
  args: { inviteId: v.id("workspaceInvites") },
  handler: async (ctx, { inviteId }) => {
    const inv = await ctx.db.get(inviteId);
    if (!inv) return;
    const { role } = await requireWorkspaceMember(ctx, inv.workspaceId);
    if (role !== "owner") throw new Error("Only owner can revoke");
    await ctx.db.delete(inviteId);
  },
});

/** Owner-only — list every pending + accepted invite for a workspace.
 *  Used by the Members panel to show pending invites alongside members. */
export const listForWorkspace = query({
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
    if (!me || me.role !== "owner") return [];
    const rows = await ctx.db
      .query("workspaceInvites")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
      .take(COUNT_CAPS.invitesScan);
    const now = Date.now();
    return rows.map((r) => ({
      _id: r._id,
      code: r.code,
      role: r.role,
      createdAt: r.createdAt,
      acceptedAt: r.acceptedAt ?? null,
      expired: !r.acceptedAt && now - r.createdAt > EXPIRY_MS,
    }));
  },
});
