// Cookieless visitor analytics ingest. `record` is the PUBLIC beacon sink,
// called only by /api/analytics (which resolves geo + hashes the caller IP
// into a bucket key). It NEVER stores a raw IP or a stable identifier.
//
// Public-write surface by design (same as convex/forms/public.ts): there is no
// signed-in user on a marketing page. Abuse is bounded by the per-IP-hash
// fixed-window limiter below — the ONLY guard, so it stays inline and cheap.
import { mutation } from "../../_generated/server";
import { v } from "convex/values";

const RL_WINDOW = 60_000;
const RL_MAX = 240; // beacons per IP per minute — generous; throttles a runaway tab/bot only
const PROP_CAP = 2000;
const VIEWPORTS = new Set(["mobile", "tablet", "desktop"]);
// Never record the signed-in console or non-page routes (defense-in-depth —
// the route filters these too). Mirrors the beacon's client-side SKIP list.
const SKIP = ["/dashboard", "/api", "/oauth", "/setup", "/auth", "/.well-known"];

const trimUtm = (s?: string) => {
  if (!s) return undefined;
  const t = s.trim().toLowerCase().slice(0, 120);
  return t || undefined;
};

export const record = mutation({
  args: {
    path: v.string(),
    referrerHost: v.optional(v.string()),
    viewport: v.optional(v.string()),
    eventType: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    utmSource: v.optional(v.string()),
    utmMedium: v.optional(v.string()),
    utmCampaign: v.optional(v.string()),
    utmTerm: v.optional(v.string()),
    utmContent: v.optional(v.string()),
    country: v.optional(v.string()),
    region: v.optional(v.string()),
    city: v.optional(v.string()),
    lat: v.optional(v.number()),
    lon: v.optional(v.number()),
    properties: v.optional(v.string()),
    ipHash: v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    const path = a.path.slice(0, 256);
    if (!path || SKIP.some((s) => path === s || path.startsWith(s + "/"))) return null;

    // Per-IP-hash fixed-window limiter. OCC-safe read-modify-write on
    // visitorRateLimits — a mutation can't runMutation an internal helper, so
    // it's inlined. The route passes sha256(ip) as ipHash; the raw IP never
    // reaches Convex.
    if (a.ipHash) {
      const key = `pv:${a.ipHash}`;
      const now = Date.now();
      const row = await ctx.db
        .query("visitorRateLimits")
        .withIndex("by_key", (q) => q.eq("key", key))
        .unique();
      if (!row || now >= row.resetAt) {
        if (row) await ctx.db.patch(row._id, { count: 1, resetAt: now + RL_WINDOW });
        else await ctx.db.insert("visitorRateLimits", { key, count: 1, resetAt: now + RL_WINDOW });
      } else if (row.count >= RL_MAX) {
        return null; // over cap — drop silently
      } else {
        await ctx.db.patch(row._id, { count: row.count + 1 });
      }
    }

    const country = a.country && /^[A-Z]{2}$/.test(a.country) ? a.country : undefined;
    const sessionId = a.sessionId && /^[a-f0-9]{8,64}$/.test(a.sessionId) ? a.sessionId : undefined;
    const properties = a.properties && a.properties.length <= PROP_CAP ? a.properties : undefined;

    await ctx.db.insert("visitorPageviews", {
      path,
      referrerHost: a.referrerHost?.slice(0, 80),
      viewport: a.viewport && VIEWPORTS.has(a.viewport) ? a.viewport : undefined,
      eventType: a.eventType?.slice(0, 40) || "page_view",
      sessionId,
      utmSource: trimUtm(a.utmSource),
      utmMedium: trimUtm(a.utmMedium),
      utmCampaign: trimUtm(a.utmCampaign),
      utmTerm: trimUtm(a.utmTerm),
      utmContent: trimUtm(a.utmContent),
      country,
      region: a.region?.slice(0, 8),
      city: a.city?.slice(0, 80),
      lat: a.lat,
      lon: a.lon,
      properties,
      at: Date.now(),
    });
    return null;
  },
});
