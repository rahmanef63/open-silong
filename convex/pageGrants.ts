/** Per-page grant MANAGEMENT (grant / revoke / list).
 *
 *  All three fns gate through `requireWorkspaceAccess(ctx, "pages", pageId,
 *  { write: true })`, which is grant-BLIND (it never reads `pageGrants`).
 *  An editor-grantee who is NOT a workspace member therefore fails the
 *  membership check here — so a grantee can never grant, revoke, or list.
 *  That bounding is what keeps editor-grant power out of grant-management.
 *
 *  The grant read/write authz surface itself lives in
 *  `convex/_shared/pageGrants.ts` (`canReadPage` / `requirePageWritable`).
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireWorkspaceAccess } from "./_shared/auth";
import { COUNT_CAPS } from "./_shared/limits";

/** Grant (or re-role) a page to an EXISTING user, resolved by email.
 *  Owner / workspace-writable member only. Upserts by (page, user): patches
 *  the role if a grant already exists, else inserts a fresh row. Throws when
 *  no account matches the email (no invite / provisioning in v1). */
export const grant = mutation({
  args: {
    pageId: v.id("pages"),
    email: v.string(),
    role: v.union(v.literal("viewer"), v.literal("editor")),
  },
  handler: async (ctx, args) => {
    const { userId: granter } = await requireWorkspaceAccess(ctx, "pages", args.pageId, { write: true });

    const email = args.email.trim().toLowerCase();
    if (!email) throw new Error("Email is required");

    // @convex-dev/auth's users table ships an "email" index — same pattern as
    // convex/ai/mutations.ts. Normalize to the stored (trim+lowercase) form.
    const grantee = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .first();
    if (!grantee) throw new Error("No account with that email");

    const existing = await ctx.db
      .query("pageGrants")
      .withIndex("by_page_user", (q) => q.eq("pageId", args.pageId).eq("userId", grantee._id))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { role: args.role });
      return { userId: grantee._id, role: args.role, updated: true };
    }
    await ctx.db.insert("pageGrants", {
      pageId: args.pageId,
      userId: grantee._id,
      role: args.role,
      grantedBy: granter,
      grantedAt: Date.now(),
    });
    return { userId: grantee._id, role: args.role, updated: false };
  },
});

/** Revoke a page grant by (page, user). Owner / workspace-writable member
 *  only. No-op (returns `{ revoked: false }`) if no grant exists. */
export const revoke = mutation({
  args: { pageId: v.id("pages"), userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireWorkspaceAccess(ctx, "pages", args.pageId, { write: true });
    const existing = await ctx.db
      .query("pageGrants")
      .withIndex("by_page_user", (q) => q.eq("pageId", args.pageId).eq("userId", args.userId))
      .unique();
    if (existing) await ctx.db.delete(existing._id);
    return { revoked: !!existing };
  },
});

/** List the grants on a page (owner / workspace-writable member only),
 *  joined with each grantee's email + name for the manage-access UI. */
export const list = query({
  args: { pageId: v.id("pages") },
  handler: async (ctx, args) => {
    await requireWorkspaceAccess(ctx, "pages", args.pageId, { write: true });
    const grants = await ctx.db
      .query("pageGrants")
      .withIndex("by_page", (q) => q.eq("pageId", args.pageId))
      .take(COUNT_CAPS.pageGrantsScan);
    const out = [];
    for (const g of grants) {
      const u = await ctx.db.get(g.userId);
      out.push({
        _id: g._id,
        userId: g.userId,
        role: g.role,
        grantedAt: g.grantedAt,
        email: (u?.email as string | undefined) ?? undefined,
        name: (u?.name as string | undefined) ?? undefined,
      });
    }
    return out;
  },
});
