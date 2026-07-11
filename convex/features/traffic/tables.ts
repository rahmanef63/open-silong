import { defineTable } from "convex/server";
import { v } from "convex/values";

// Cookieless visitor analytics — one row per page_view / custom event.
// No cookie, no stored IP (geo is resolved server-side in /api/analytics
// then the raw IP is discarded), no stable identifier. sessionId is an
// ephemeral sessionStorage random — enough to count unique visits without
// tracking a person. Additive schema: older rows read fine with newer
// optional fields undefined.
//
// NOTE: named `visitorPageviews` on purpose — this repo already has a
// `pageViews` table (per-user read receipts, convex/pageViews.ts). These are
// unrelated; do not confuse them. This one is anonymous marketing traffic.
export const trafficTables = {
  visitorPageviews: defineTable({
    path: v.string(), // pathname only, no querystring
    referrerHost: v.optional(v.string()), // origin host only, never the full URL
    viewport: v.optional(v.string()), // "mobile" | "tablet" | "desktop"
    eventType: v.optional(v.string()), // "page_view" (default) | custom event name
    sessionId: v.optional(v.string()), // ephemeral per-session random (16 hex)
    // campaign attribution (captured on first hit, re-sent per event)
    utmSource: v.optional(v.string()),
    utmMedium: v.optional(v.string()),
    utmCampaign: v.optional(v.string()),
    utmTerm: v.optional(v.string()),
    utmContent: v.optional(v.string()),
    // geo — resolved from the client IP via geoip-lite in the route, then the
    // raw IP is dropped (never stored). All optional (a lookup can miss).
    country: v.optional(v.string()), // ISO-3166-1 alpha-2
    region: v.optional(v.string()), // subdivision code
    city: v.optional(v.string()),
    lat: v.optional(v.number()),
    lon: v.optional(v.number()),
    properties: v.optional(v.string()), // JSON string, capped, for custom events
    at: v.number(),
  })
    .index("by_at", ["at"])
    .index("by_path_at", ["path", "at"]),

  // Per-IP-hash fixed-window counter for the public beacon ingest. The repo's
  // existing `rateLimits` table is keyed by (userId, scope) and can't hold an
  // anonymous ipHash string, so the beacon gets its own counter (the recipe's
  // "simple counter" branch). One row per "pv:<sha256(ip)>"; Convex OCC makes
  // the read-modify-write race-safe. `by_reset` lets a future maintenance
  // prune sweep expired buckets without a full scan.
  visitorRateLimits: defineTable({
    key: v.string(), // "pv:<sha256(ip)>"
    count: v.number(),
    resetAt: v.number(), // window end (ms epoch); past it the window resets
  })
    .index("by_key", ["key"])
    .index("by_reset", ["resetAt"]),
};
