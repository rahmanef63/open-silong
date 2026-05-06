/** @type {import('next').NextConfig} */
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nosion.rahmanef.com";
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL ?? "https://api-notion-page-clone.rahmanef.com";
const convexHost = (() => {
  try { return new URL(convexUrl).hostname; } catch { return "api-notion-page-clone.rahmanef.com"; }
})();

// Stable per-deploy build id. CI sets GITHUB_SHA / DOKPLOY_COMMIT_SHA;
// fallback timestamp keeps dev unique. Exposed to the client as
// NEXT_PUBLIC_BUILD_ID so VersionWatcher can compare and prompt reload.
const BUILD_ID =
  process.env.NEXT_PUBLIC_BUILD_ID ||
  process.env.GITHUB_SHA ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.DOKPLOY_COMMIT_SHA ||
  process.env.COMMIT_SHA ||
  `dev-${Date.now()}`;
process.env.NEXT_PUBLIC_BUILD_ID = BUILD_ID;

const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  generateBuildId: () => BUILD_ID,
  images: {
    // Convex storage URLs (ctx.storage.getUrl) live on the Convex API host —
    // allowlisting lets us drop `unoptimized` on Image components that
    // render storage blobs. User-pasted external URLs (ImageBlock,
    // GalleryView) still use `unoptimized` because the URL space is open.
    remotePatterns: [
      { protocol: "https", hostname: convexHost, pathname: "/api/storage/**" },
      // Common cover/avatar hosts users paste — kept narrow on purpose.
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
  // cacheComponents: requires every route under a Suspense boundary OR
  // explicit "use cache" — the ConvexAuthNextjsServerProvider in layout
  // reads cookies dynamically, currently blocking layout-level enablement.
  // Tracking deferral + exit criteria in docs/audit/cache-components.md.
  // cacheComponents: true,
  deploymentId: process.env.NEXT_PUBLIC_DEPLOYMENT_ID,
  typescript: { ignoreBuildErrors: false },
  experimental: {
    serverActions: {
      allowedOrigins: [new URL(siteUrl).host],
      bodySizeLimit: "5mb",
    },
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-popover",
      "@radix-ui/react-tooltip",
      "@radix-ui/react-select",
      "@radix-ui/react-tabs",
      "@radix-ui/react-scroll-area",
      "@radix-ui/react-context-menu",
      "@dnd-kit/core",
      "@dnd-kit/sortable",
      "@dnd-kit/utilities",
      "cmdk",
      "sonner",
    ],
  },
  turbopack: {},
  async redirects() {
    // Pre-/dashboard URLs from before the app was moved under a route prefix.
    return [
      { source: "/p/:id", destination: "/dashboard/p/:id", permanent: true },
      { source: "/inbox", destination: "/dashboard/inbox", permanent: true },
      { source: "/trash", destination: "/dashboard/trash", permanent: true },
      { source: "/settings", destination: "/dashboard/settings", permanent: true },
      { source: "/profile", destination: "/dashboard/profile", permanent: true },
    ];
  },
  async headers() {
    // CSP: 'unsafe-inline' is unavoidable until Next 16 wires per-request
    // nonces through React 19 SSR — the framework still emits inline
    // bootstrap scripts. Everything else is locked to known origins.
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://accounts.google.com",
      "style-src 'self' 'unsafe-inline'",
      `img-src 'self' data: blob: https://cdn.jsdelivr.net https://images.unsplash.com https://avatars.githubusercontent.com https://lh3.googleusercontent.com https://${convexHost}`,
      "font-src 'self' data:",
      `connect-src 'self' https://${convexHost} wss://${convexHost} https://www.google-analytics.com https://accounts.google.com`,
      "frame-src 'self' https://accounts.google.com",
      "manifest-src 'self'",
      "worker-src 'self' blob:",
    ].join("; ");
    return [
      {
        source: "/manifest.webmanifest",
        headers: [
          { key: "Content-Type", value: "application/manifest+json" },
          { key: "Cache-Control", value: "no-cache" },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Content-Security-Policy", value: csp },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
        ],
      },
    ];
  },
};

export default nextConfig;
