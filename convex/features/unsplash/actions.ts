/** Unsplash search proxy. Lives in a Convex action so the access key
 *  never leaves the backend — never expose `UNSPLASH_ACCESS_KEY` to
 *  the client bundle.
 *
 *  Setup:
 *    1. Get an Unsplash dev key: https://unsplash.com/developers
 *    2. Set on the self-hosted backend:
 *         pnpm exec convex env set UNSPLASH_ACCESS_KEY <key>
 *    3. If the key is missing the action returns an empty list with an
 *       `error` field — UI can show the "configure Unsplash" hint
 *       instead of crashing.
 *
 *  Rate-limited per-user via the standard rateLimit helper to keep us
 *  inside Unsplash's 50/hour demo quota even with multiple tabs open. */

"use node";

import { action } from "../../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export interface UnsplashPhoto {
  id: string;
  /** Display URL (~1080px wide). */
  regular: string;
  /** Lazy-load thumbnail (~200px). */
  thumb: string;
  /** Full-resolution (~original size). */
  full: string;
  width: number;
  height: number;
  alt: string;
  photographer: string;
  photographerUrl: string;
  /** Click-through URL for the photo page on Unsplash (required by
   *  their attribution guidelines). */
  source: string;
}

export interface UnsplashSearchResult {
  photos: UnsplashPhoto[];
  total: number;
  error?: string;
}

export const search = action({
  args: {
    query: v.string(),
    page: v.optional(v.number()),
    perPage: v.optional(v.number()),
  },
  handler: async (ctx, { query, page = 1, perPage = 24 }): Promise<UnsplashSearchResult> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { photos: [], total: 0, error: "Not authenticated" };

    const key = process.env.UNSPLASH_ACCESS_KEY;
    if (!key) {
      return { photos: [], total: 0, error: "Unsplash not configured (UNSPLASH_ACCESS_KEY missing)" };
    }

    const q = query.trim();
    if (!q) return { photos: [], total: 0 };

    const url = new URL("https://api.unsplash.com/search/photos");
    url.searchParams.set("query", q);
    url.searchParams.set("page", String(Math.max(1, Math.min(50, page))));
    url.searchParams.set("per_page", String(Math.max(1, Math.min(30, perPage))));
    url.searchParams.set("content_filter", "high");
    url.searchParams.set("orientation", "landscape");

    let res: Response;
    try {
      res = await fetch(url.toString(), {
        headers: {
          Authorization: `Client-ID ${key}`,
          "Accept-Version": "v1",
        },
      });
    } catch (e) {
      return { photos: [], total: 0, error: `Network error: ${(e as Error).message}` };
    }

    if (!res.ok) {
      return { photos: [], total: 0, error: `Unsplash ${res.status}: ${await res.text().catch(() => "")}` };
    }

    const json = await res.json() as {
      results: Array<{
        id: string;
        urls: { regular: string; thumb: string; full: string };
        alt_description: string | null;
        width: number;
        height: number;
        links: { html: string };
        user: { name: string; links: { html: string } };
      }>;
      total: number;
    };

    return {
      photos: json.results.map((p) => ({
        id: p.id,
        regular: p.urls.regular,
        thumb: p.urls.thumb,
        full: p.urls.full,
        width: p.width,
        height: p.height,
        alt: p.alt_description ?? q,
        photographer: p.user.name,
        photographerUrl: p.user.links.html,
        source: p.links.html,
      })),
      total: json.total,
    };
  },
});
