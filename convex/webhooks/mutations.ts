/** Webhook endpoint CRUD. Owner-scoped — viewer must own every row
 *  they create/toggle/delete. Auto-dispatch from entity mutations
 *  (page.created/updated/deleted) is a follow-up — for v1, trigger
 *  via the `webhooks/deliver:run` action manually. */

import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { toBase64Url } from "../_shared/encoding";

const MAX_URL_LEN = 500;
const MAX_EVENTS = 20;

function randomSecret(): string {
  // 32 bytes of base64url — convex action runtime exposes `crypto`.
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

export const create = mutation({
  args: {
    url: v.string(),
    events: v.array(v.string()),
    secret: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const url = args.url.trim();
    if (!/^https?:\/\//.test(url)) throw new Error("URL must start with http:// or https://");
    if (url.length > MAX_URL_LEN) throw new Error("URL too long");
    if (args.events.length === 0) throw new Error("Subscribe to at least one event");
    if (args.events.length > MAX_EVENTS) throw new Error("Too many event subscriptions");
    const secret = args.secret?.trim() || randomSecret();
    const id = await ctx.db.insert("webhookEndpoints", {
      userId,
      url,
      events: args.events,
      secret,
      enabled: true,
      createdAt: Date.now(),
    });
    // Secret returned ONCE — `listMine` strips it from subsequent
    // responses. UI shows it in a copy-once toast.
    return { id, secret };
  },
});

export const toggle = mutation({
  args: { endpointId: v.id("webhookEndpoints") },
  handler: async (ctx, { endpointId }) => {
    const userId = await getAuthUserId(ctx);
    const doc = await ctx.db.get(endpointId);
    if (!doc || doc.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(endpointId, { enabled: !doc.enabled });
  },
});

export const remove = mutation({
  args: { endpointId: v.id("webhookEndpoints") },
  handler: async (ctx, { endpointId }) => {
    const userId = await getAuthUserId(ctx);
    const doc = await ctx.db.get(endpointId);
    if (!doc || doc.userId !== userId) throw new Error("Not found");
    await ctx.db.delete(endpointId);
  },
});
