/** Workspace site — directory of publicly-shared pages in a workspace.
 *
 *  Resolves `/site/[wsSlug]` to the workspace whose `slug` matches,
 *  then returns every page in that workspace that has `isPublic === true`
 *  (i.e. has gone through `/share`). The site page renders a flat
 *  directory + each entry links to the existing `/share/[id]` view.
 *
 *  No new schema — piggy-backs on existing `workspaces.slug`,
 *  `pages.isPublic`, and `pages.workspaceId`. Future expansion path:
 *  custom subdomain + auto-generated tree nav.
 */

import { v } from "convex/values";
import { query } from "./_generated/server";

const MAX_LISTED = 200;

export const workspaceDirectory = query({
  args: { wsSlug: v.string() },
  handler: async (ctx, { wsSlug }) => {
    const ws = await ctx.db
      .query("workspaces")
      .withIndex("by_slug", (q) => q.eq("slug", wsSlug))
      .unique();
    if (!ws) return null;

    const pages = await ctx.db
      .query("pages")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", ws._id))
      .take(MAX_LISTED);

    const publicPages = pages
      .filter((p) => p.isPublic === true && !p.trashed)
      .map((p) => ({
        id: p._id,
        title: p.title,
        icon: p.icon,
        shareSlug: p.shareSlug ?? null,
        updatedAt: p.updatedAt,
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt);

    return {
      workspace: {
        name: ws.name,
        emoji: ws.emoji,
        slug: ws.slug,
      },
      pages: publicPages,
    };
  },
});
