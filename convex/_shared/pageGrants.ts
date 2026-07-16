/** Per-page grants authz surface (v1, flat — no cascade).
 *
 *  This module is the ONLY place the `pageGrants` table is consulted for
 *  authorization, so an editor-grant's total power stays small + grep-able:
 *    - READ  via `canReadPage`         → wired into `pages.getById`
 *    - WRITE via `requirePageWritable` → wired into the 9 CONTENT mutations
 *      in `pages.ts` (update + block ops).
 *
 *  Everything else (trash / permanentlyDelete / setPublic / share-slug /
 *  grant-management) keeps the grant-BLIND `requireWorkspaceAccess` gate,
 *  so a grantee can never reach those surfaces. Grant MANAGEMENT lives in
 *  `convex/pageGrants.ts`, also behind the grant-blind gate.
 */

import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { requireAuth } from "./auth";
import { COUNT_CAPS } from "./limits";

const FORBIDDEN = "Tidak berwenang";
const NOT_FOUND = "Tidak ditemukan";

/** O(1) grant probe via `by_page_user`. Returns the grant row or null. */
export async function readPageGrant(
  ctx: QueryCtx | MutationCtx,
  pageId: Id<"pages">,
  userId: Id<"users">,
): Promise<Doc<"pageGrants"> | null> {
  return await ctx.db
    .query("pageGrants")
    .withIndex("by_page_user", (q) => q.eq("pageId", pageId).eq("userId", userId))
    .unique();
}

/** Read authorization for a page. True when the viewer is the owner, a
 *  member of the page's workspace, OR holds ANY grant (viewer|editor).
 *  Never throws — mirrors `getById`'s null-on-deny contract. */
export async function canReadPage(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  doc: Doc<"pages">,
): Promise<boolean> {
  // Owner (covers legacy unstamped rows AND is a cheap fast-path for
  // workspace-stamped rows, where the owner is always a member too).
  if (doc.userId === userId) return true;
  if (doc.workspaceId) {
    const m = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_user_workspace", (q) =>
        q.eq("userId", userId).eq("workspaceId", doc.workspaceId!),
      )
      .unique();
    if (m) return true;
  }
  const grant = await readPageGrant(ctx, doc._id, userId);
  return !!grant;
}

/** Write gate for page CONTENT edits. Returns `{ userId, doc }` — a drop-in
 *  for the `{ userId, doc: page }` and `{ doc: page }` destructures at the 9
 *  content mutations. Passes when the viewer is a workspace-WRITABLE member
 *  (role !== "viewer"), a legacy owner (no workspaceId && doc.userId ===
 *  userId), OR holds an EDITOR grant.
 *
 *  On deny it distinguishes forbidden-vs-hidden the same way the workspace
 *  gate does: FORBIDDEN when the viewer can at least READ the page (viewer
 *  member / viewer grant), else NOT_FOUND (never leak existence). */
export async function requirePageWritable(
  ctx: MutationCtx,
  pageId: Id<"pages">,
): Promise<{ userId: Id<"users">; doc: Doc<"pages"> }> {
  const userId = await requireAuth(ctx);
  const doc = await ctx.db.get(pageId);
  if (!doc) throw new Error(NOT_FOUND);

  if (doc.workspaceId) {
    const m = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_user_workspace", (q) =>
        q.eq("userId", userId).eq("workspaceId", doc.workspaceId!),
      )
      .unique();
    if (m && m.role !== "viewer") return { userId, doc };
  } else if (doc.userId === userId) {
    return { userId, doc };
  }

  const grant = await readPageGrant(ctx, pageId, userId);
  if (grant && grant.role === "editor") return { userId, doc };

  if (await canReadPage(ctx, userId, doc)) throw new Error(FORBIDDEN);
  throw new Error(NOT_FOUND);
}

/** Best-effort delete of every grant on a page — called from
 *  `pages.permanentlyDelete` for orphan hygiene. Bounded by
 *  `COUNT_CAPS.pageGrantsScan`; `sharedWithMe` already filters missing
 *  pages, so a leftover row is harmless — this just keeps the table small. */
export async function deletePageGrantsForPage(
  ctx: MutationCtx,
  pageId: Id<"pages">,
): Promise<void> {
  const rows = await ctx.db
    .query("pageGrants")
    .withIndex("by_page", (q) => q.eq("pageId", pageId))
    .take(COUNT_CAPS.pageGrantsScan);
  for (const r of rows) await ctx.db.delete(r._id);
}
