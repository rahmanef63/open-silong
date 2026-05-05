import type { MetadataRoute } from "next";

const BASE = "https://nosion.rahmanef.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: BASE, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE}/auth`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
  ];
}
