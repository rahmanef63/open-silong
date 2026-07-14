/** Outbound webhook delivery. Called by other Convex mutations after
 *  successful state changes — e.g. `pages.create` → `deliver({
 *  ownerId, event: "page.created", payload: { ... } })`.
 *
 *  HMAC-SHA256 signature emitted as `X-Nosion-Signature: sha256=<hex>`
 *  over the JSON-serialised body, keyed by the endpoint's secret. Each
 *  attempt logged to `webhookDeliveries`. Failures DO NOT block the
 *  triggering mutation — best-effort fan-out.
 */

import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";
import { COUNT_CAPS } from "../_shared/limits";

const TIMEOUT_MS = 5000;

async function hmacHex(secret: string, body: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const run = internalAction({
  args: {
    ownerId: v.id("users"),
    event: v.string(),
    payload: v.any(),
  },
  // Explicit return type breaks the self-reference cycle: this handler reads
  // `internal.webhooks.deliver.*`, whose type depends on `run`'s inferred
  // type (TS7022/7023 → `any` poisons the `internal` graph).
  handler: async (ctx, { ownerId, event, payload }): Promise<{ fanOut: number; delivered: number }> => {
    const endpoints = await ctx.runQuery(internal.webhooks.deliver.listEnabledForOwner, {
      ownerId,
    });
    const body = JSON.stringify({ event, payload });
    let delivered = 0;

    for (const ep of endpoints) {
      if (!ep.events.includes(event)) continue;
      const sig = await hmacHex(ep.secret, body);
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
      let statusCode: number | undefined;
      let error: string | undefined;
      try {
        const res = await fetch(ep.url, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-nosion-event": event,
            "x-nosion-signature": `sha256=${sig}`,
          },
          body,
          signal: controller.signal,
        });
        statusCode = res.status;
        if (!res.ok) error = `HTTP ${res.status}`;
        else delivered++;
      } catch (e) {
        error = (e as Error).message;
      } finally {
        clearTimeout(t);
      }
      await ctx.runMutation(internal.webhooks.deliver.recordDelivery, {
        endpointId: ep._id,
        event,
        payload,
        statusCode,
        error,
      });
    }
    return { fanOut: endpoints.length, delivered };
  },
});

export const listEnabledForOwner = internalQuery({
  args: { ownerId: v.id("users") },
  handler: async (ctx, { ownerId }) => {
    const rows = await ctx.db
      .query("webhookEndpoints")
      .withIndex("by_user", (q) => q.eq("userId", ownerId))
      .take(COUNT_CAPS.webhookEndpointsScan);
    return rows.filter((r) => r.enabled);
  },
});

export const recordDelivery = internalMutation({
  args: {
    endpointId: v.id("webhookEndpoints"),
    event: v.string(),
    payload: v.any(),
    statusCode: v.optional(v.number()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, { endpointId, event, payload, statusCode, error }) => {
    const now = Date.now();
    await ctx.db.insert("webhookDeliveries", {
      endpointId,
      event,
      payload,
      attemptedAt: now,
      statusCode,
      error,
    });
    const patch: Record<string, unknown> = {};
    if (error) {
      patch.lastErrorAt = now;
      patch.lastError = error.slice(0, 500);
    } else {
      patch.lastSuccessAt = now;
      patch.lastError = undefined;
    }
    await ctx.db.patch(endpointId, patch);
  },
});
