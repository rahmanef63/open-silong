import type { MetadataRoute } from "next";
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";

const BASE = "https://nosion.rahmanef.com";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const base: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE}/auth`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
  ];
  let shared: Array<{ id: string; slug?: string; updatedAt: number }> = [];
  try {
    shared = await fetchQuery(api.pages.listPublicForSitemap, {});
  } catch {
    /* sitemap is best-effort — never fail the build over Convex */
  }
  const sharePages: MetadataRoute.Sitemap = shared.map((p) => ({
    url: `${BASE}/share/${p.slug ?? p.id}`,
    lastModified: new Date(p.updatedAt),
    changeFrequency: "weekly",
    priority: 0.6,
  }));
  return [...base, ...sharePages];
}
