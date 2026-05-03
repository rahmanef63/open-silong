import { getAuthUserId } from "@convex-dev/auth/server";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

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

/** Mutation-only. Idempotent: creates profile if missing. Auto-promotes when
 *  user's email matches ADMIN_BOOTSTRAP_EMAILS. Returns the profile doc. */
export async function ensureUserProfile(ctx: MutationCtx, userId: Id<"users">) {
  const existing = await readProfile(ctx, userId);
  if (existing) return existing;
  const user = await ctx.db.get(userId);
  const email = (user?.email as string | undefined)?.trim().toLowerCase();
  const role = email && bootstrapEmails().has(email) ? "admin" : "user";
  const id = await ctx.db.insert("userProfiles", {
    userId,
    role,
    createdAt: Date.now(),
  });
  return (await ctx.db.get(id))!;
}

/** Mutation-only — bootstraps profile on demand, then enforces admin role. */
export async function requireAdmin(ctx: MutationCtx): Promise<Id<"users">> {
  const userId = await requireAuth(ctx);
  const profile = await ensureUserProfile(ctx, userId);
  if (profile.role !== "admin") throw new Error(FORBIDDEN);
  return userId;
}

/** Query-only — read-only check; does NOT bootstrap. Throws if absent or not admin. */
export async function requireAdminQuery(ctx: QueryCtx): Promise<Id<"users">> {
  const userId = await requireAuth(ctx);
  const profile = await readProfile(ctx, userId);
  if (!profile || profile.role !== "admin") throw new Error(FORBIDDEN);
  return userId;
}

/** Stricter: matches SUPER_ADMIN_EMAIL env exactly. Works in queries + mutations. */
export async function requireSuperAdmin(ctx: QueryCtx | MutationCtx): Promise<Id<"users">> {
  const userId = await requireAuth(ctx);
  const target = superAdminEmail();
  if (!target) throw new Error(FORBIDDEN);
  const user = await ctx.db.get(userId);
  const email = (user?.email as string | undefined)?.trim().toLowerCase();
  if (email !== target) throw new Error(FORBIDDEN);
  return userId;
}

export async function actorEmail(ctx: QueryCtx | MutationCtx, userId: Id<"users">): Promise<string | undefined> {
  const u = await ctx.db.get(userId);
  return (u?.email as string | undefined) ?? undefined;
}

export const ERR_FORBIDDEN = FORBIDDEN;
