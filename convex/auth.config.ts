// Self-hosted Convex uses CONVEX_SITE_URL env at the backend.
// On cloud-hosted, set via `npx convex env set CONVEX_SITE_URL https://...`.
// Falls back to CONVEX_SITE_ORIGIN (compose env name) when SITE_URL not set.
export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL ?? process.env.CONVEX_SITE_ORIGIN,
      applicationID: "convex",
    },
  ],
};
