// Cookieless visitor beacon ingest. The client posts via navigator.sendBeacon;
// we resolve geo from the caller IP (geoip-lite — offline, no MaxMind, no
// external call), hash the IP into a rate-limit bucket key, then DISCARD the raw
// IP (never sent to Convex, never stored). Fire-and-forget → always 204.
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import geoip from "geoip-lite";
import { createHash } from "node:crypto";

export const runtime = "nodejs"; // geoip-lite reads its .dat data files via fs

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL || "";
const VIEWPORTS = new Set(["mobile", "tablet", "desktop"]);
// Never record the signed-in console or non-page routes. Mirrors the beacon's
// client SKIP list + the record mutation's server-side guard.
const SKIP = ["/dashboard", "/api", "/oauth", "/setup", "/auth", "/.well-known"];

const str = (x: unknown, max: number): string | undefined =>
  typeof x === "string" && x ? x.slice(0, max) : undefined;

// Public origin — prefer the proxy's forwarded host (Dokploy/Traefik), then the
// request origin (correct on Vercel), then env. No hardcoded domain.
function publicOrigin(req: Request): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (site) return site.replace(/\/+$/, "");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "https";
  if (host) return `${proto}://${host}`;
  try {
    return new URL(req.url).origin;
  } catch {
    return "";
  }
}

// Caller IP for geo + rate-limit bucket. SECURITY: never trust the LEFTMOST
// x-forwarded-for hop — a client can forge it. Trust Vercel's x-vercel-ip
// headers / x-real-ip (proxy-set, not client-appendable) or the RIGHTMOST XFF
// entry (the hop our own proxy added). "?" = one conservative bucket.
function clientIp(req: Request): string {
  const real = req.headers.get("x-real-ip") || req.headers.get("x-vercel-forwarded-for");
  if (real) return real.split(",")[0].trim();
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  return "?";
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return new Response(null, { status: 204 });
  }

  const path = str(body?.path, 256);
  if (!path || SKIP.some((s) => path === s || path.startsWith(s + "/"))) {
    return new Response(null, { status: 204 });
  }

  // referrer → host, dropping own-host self-referrals (SPA nav is same-origin).
  let referrerHost: string | undefined;
  const ref = str(body?.referrer, 300);
  if (ref) {
    try {
      const u = new URL(ref);
      const ownHost = new URL(publicOrigin(req)).host;
      if (u.host && u.host !== ownHost) referrerHost = u.host.slice(0, 80);
    } catch {
      /* malformed referrer — ignore */
    }
  }

  const ip = clientIp(req);
  const geo = ip && ip !== "?" ? geoip.lookup(ip) : null;
  // Vercel edge already resolves country — use it as a fallback when the
  // offline geoip db misses (e.g. a fresh IP block).
  const country = geo?.country || req.headers.get("x-vercel-ip-country") || undefined;
  const region = geo?.region || req.headers.get("x-vercel-ip-country-region") || undefined;
  const city = geo?.city || req.headers.get("x-vercel-ip-city") || undefined;
  const ipHash = ip && ip !== "?" ? createHash("sha256").update(ip).digest("hex") : undefined;

  if (!CONVEX_URL) return new Response(null, { status: 204 });
  const client = new ConvexHttpClient(CONVEX_URL);
  void client
    .mutation(api.features.traffic.mutations.record, {
      path,
      referrerHost,
      viewport: VIEWPORTS.has(body?.viewport as string) ? (body.viewport as string) : undefined,
      eventType: str(body?.eventType, 40),
      sessionId: str(body?.sessionId, 64),
      utmSource: str(body?.utmSource, 120),
      utmMedium: str(body?.utmMedium, 120),
      utmCampaign: str(body?.utmCampaign, 120),
      utmTerm: str(body?.utmTerm, 120),
      utmContent: str(body?.utmContent, 120),
      country: country ? country.slice(0, 2).toUpperCase() : undefined,
      region: region || undefined,
      city: city ? decodeURIComponent(city) : undefined,
      lat: geo?.ll?.[0],
      lon: geo?.ll?.[1],
      properties: str(body?.properties, 2000),
      ipHash,
    })
    .catch(() => {});

  return new Response(null, { status: 204 });
}
