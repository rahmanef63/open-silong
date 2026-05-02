/** @type {import('next').NextConfig} */
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nosion.rahmanef.com";

const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  // cacheComponents: requires every route under a Suspense boundary OR
  // explicit "use cache" — the ConvexAuthNextjsServerProvider in layout
  // reads cookies dynamically, currently blocking layout-level enablement.
  // Re-enable once auth provider is moved behind a per-route Suspense and
  // /share/[id] gets a "use cache" + cacheTag annotation.
  // cacheComponents: true,
  deploymentId: process.env.NEXT_PUBLIC_DEPLOYMENT_ID,
  // Pre-existing legacy slice TS drift; tightened to strictNullChecks=false
  // tsconfig. TODO(s6+): tsc --noEmit in CI, fix tree, drop this flag.
  typescript: { ignoreBuildErrors: true },
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
  async headers() {
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
        ],
      },
    ];
  },
};

export default nextConfig;
