import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import Script from "next/script";
import { Inter, Fraunces } from "next/font/google";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import Providers from "./providers";
import { HeadHints } from "@/shared/components/HeadHints";
import { InstallPrompt } from "@/shared/components/InstallPrompt";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  // Single variable font file covers every weight 100-900 — saves the
  // multi-weight preload bandwidth and silences the "preloaded but not
  // used within a few seconds" browser warning that fires when one
  // weight's woff2 isn't touched in first paint.
  variable: "--font-inter",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-fraunces",
  display: "swap",
  // Opt-in only — applied per-page via `font: "serif"` user setting and
  // a handful of marketing surfaces. Preloading it on every route burns
  // bandwidth + trips the "preloaded but not used" browser warning on
  // typical sans-only pages (dashboard, inbox, settings, …).
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL("https://nosion.rahmanef.com"),
  title: {
    default: "Nosion — A calm workspace for notes & pages",
    template: "%s · Nosion",
  },
  description:
    "A clean, block-based workspace to write, organise and search notes. Sidebar, slash commands, drag-and-drop blocks, autosave, formulas and relations.",
  authors: [{ name: "Nosion" }],
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/apple-touch-icon.png",
    other: [{ rel: "mask-icon", url: "/logo-mark-fill-black.svg", color: "#f08a40" }],
  },
  appleWebApp: {
    capable: true,
    title: "Nosion",
    statusBarStyle: "default",
  },
  openGraph: {
    title: "Nosion — A calm workspace for notes & pages",
    description: "A clean, block-based workspace to write, organise and search notes.",
    type: "website",
    url: "https://nosion.rahmanef.com",
    siteName: "Nosion",
    images: [{ url: "/banner-light.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nosion — A calm workspace for notes & pages",
    description: "Block-based notes with slash commands, drag-and-drop, autosave, formulas, relations.",
    images: ["/banner-light.png"],
  },
  verification: {
    google: "cIVgVzi0xUCpY-4p2HRfbJpvllEnbGu8poddkl3qFng",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f08a40" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1d24" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ConvexAuthNextjsServerProvider>
      <html lang="en" suppressHydrationWarning className={`${inter.variable} ${fraunces.variable}`}>
        <HeadHints />
        <body>
          <div id="root">
            <Providers>
              <Suspense fallback={null}>{children}</Suspense>
            </Providers>
          </div>
          <InstallPrompt />
          <Script
            src="https://www.googletagmanager.com/gtag/js?id=G-82JXWGW4GM"
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-82JXWGW4GM');`}
          </Script>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
