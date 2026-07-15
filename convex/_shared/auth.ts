import { getAuthUserId } from "@convex-dev/auth/server";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";

const FORBIDDEN = "Tidak berwenang";

function bootstrapEmails(): Set<string> {
  const raw = process.env.ADMIN_BOOTSTRAP_EMAILS ?? "";
  return new Set(
    raw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean),
  );
}

function superAdminEmail(): string | null {
  const raw = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  return raw || null;
}

export async function requireAuth(ctx: QueryCtx | MutationCtx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Belum login");
  return userId;
}

async function readProfile(ctx: QueryCtx | MutationCtx, userId: Id<"users">) {
  return await ctx.db
    .query("userProfiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
}

/** Mutation-only. Idempotent: creates profile if missing. Auto-promotes to
 *  "superadmin" if email matches SUPER_ADMIN_EMAIL, else "admin" if in
 *  ADMIN_BOOTSTRAP_EMAILS, else "user". Re-promotes existing profiles whose
 *  email later matches SUPER_ADMIN_EMAIL. */
export async function ensureUserProfile(ctx: MutationCtx, userId: Id<"users">) {
  const user = await ctx.db.get(userId);
  const email = (user?.email as string | undefined)?.trim().toLowerCase();
  const superTarget = superAdminEmail();
  const isSuper = !!email && !!superTarget && email === superTarget;
  const isAdmin = !!email && bootstrapEmails().has(email);
  const desired: "superadmin" | "admin" | "user" = isSuper
    ? "superadmin"
    : isAdmin
      ? "admin"
      : "user";

  const existing = await readProfile(ctx, userId);
  if (existing) {
    // Idempotent re-promotion only — never demote here.
    if (
      (desired === "superadmin" && existing.role !== "superadmin") ||
      (desired === "admin" && existing.role === "user")
    ) {
      await ctx.db.patch(existing._id, { role: desired });
      return { ...existing, role: desired };
    }
    return existing;
  }
  const id = await ctx.db.insert("userProfiles", {
    userId,
    role: desired,
    createdAt: Date.now(),
  });
  return (await ctx.db.get(id))!;
}

/** Mutation-only — bootstraps profile on demand, then enforces admin or
 *  superadmin role. */
export async function requireAdmin(ctx: MutationCtx): Promise<Id<"users">> {
  const userId = await requireAuth(ctx);
  const profile = await ensureUserProfile(ctx, userId);
  if (profile.role !== "admin" && profile.role !== "superadmin") {
    throw new Error(FORBIDDEN);
  }
  return userId;
}

/** Query-only — read-only check; does NOT bootstrap. Throws if absent or
 *  not admin/superadmin. */
export async function requireAdminQuery(ctx: QueryCtx): Promise<Id<"users">> {
  const userId = await requireAuth(ctx);
  const profile = await readProfile(ctx, userId);
  if (!profile || (profile.role !== "admin" && profile.role !== "superadmin")) {
    throw new Error(FORBIDDEN);
  }
  return userId;
}

export async function actorEmail(ctx: QueryCtx | MutationCtx, userId: Id<"users">): Promise<string | undefined> {
  const u = await ctx.db.get(userId);
  return (u?.email as string | undefined) ?? undefined;
}

/** Resolve a doc by id and enforce `doc.userId === userId`. Throws "not
 *  found" — never leak existence. Returns the doc on success.
 *
 *  Use in place of the `getAuthUserId → throw if !userId → db.get → throw
 *  if doc.userId !== userId` triplet (was repeated in 22 sites). */
type OwnedTable = "pages" | "databases" | "snapshots";

export async function requireOwned<T extends OwnedTable>(
  ctx: QueryCtx | MutationCtx,
  _table: T,
  id: Id<T>,
): Promise<{ userId: Id<"users">; doc: Doc<T> }> {
  const userId = await requireAuth(ctx);
  const doc = await ctx.db.get(id);
  if (!doc) throw new Error("Tidak ditemukan");
  const ownerId = (doc as unknown as { userId: Id<"users"> }).userId;
  if (ownerId !== userId) throw new Error("Tidak ditemukan");
  return { userId, doc: doc as Doc<T> };
}

type WsRole = "owner" | "editor" | "viewer";

/** Resolve a doc by id and enforce viewer is a member of the doc's
 *  workspace. Falls back to ownership for legacy rows that pre-date
 *  the multi-workspace migration (no workspaceId stamped).
 *
 *  - `opts.write = true` rejects viewers (read-only role).
 *  - Throws "Tidak ditemukan" on missing doc / non-member to avoid
 *    leaking existence; throws FORBIDDEN when the role is too low.
 *
 *  Use this in place of `requireOwned` for any read/write that should
 *  be reachable by invited members of a shared workspace. Owner-only
 *  state changes (workspace rename, public-share toggle) should keep
 *  `requireOwned`. */
export async function requireWorkspaceAccess<T extends OwnedTable>(
  ctx: QueryCtx | MutationCtx,
  _table: T,
  id: Id<T>,
  opts: { write?: boolean } = {},
): Promise<{ userId: Id<"users">; doc: Doc<T>; role: WsRole }> {
  const userId = await requireAuth(ctx);
  const doc = await ctx.db.get(id);
  if (!doc) throw new Error("Tidak ditemukan");
  const wsId = (doc as unknown as { workspaceId?: Id<"workspaces"> }).workspaceId;
  let role: WsRole | null = null;
  if (wsId) {
    const m = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_user_workspace", (q) =>
        q.eq("userId", userId).eq("workspaceId", wsId),
      )
      .unique();
    if (m) role = m.role;
  } else {
    // Legacy row pre-multi-workspace: owner-only.
    const ownerId = (doc as unknown as { userId: Id<"users"> }).userId;
    if (ownerId === userId) role = "owner";
  }
  if (!role) throw new Error("Tidak ditemukan");
  if (opts.write && role === "viewer") throw new Error(FORBIDDEN);
  return { userId, doc: doc as Doc<T>, role };
}
