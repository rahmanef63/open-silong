import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getMe = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;
    const email = (user.email as string | undefined) ?? null;
    const name = (user.name as string | undefined) ?? null;
    const image = (user.image as string | undefined) ?? null;
    return {
      _id: user._id,
      email,
      name,
      image,
      // Display name: stored name → email local part → "User"
      displayName: name && name.trim()
        ? name.trim()
        : (email ? email.split("@")[0] : "User"),
    };
  },
});

/** Persist a name on the authed user. Idempotent. Trims; rejects empty. */
export const setMyName = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Belum login");
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Nama kosong");
    if (trimmed.length > 80) throw new Error("Nama terlalu panjang");
    await ctx.db.patch(userId, { name: trimmed });
    return { ok: true };
  },
});
