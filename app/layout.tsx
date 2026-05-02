import type { Metadata, Viewport } from "next";
import "./globals.css";

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
    <html lang="en" suppressHydrationWarning>
      <body>
        <div id="root">{children}</div>
      </body>
    </html>
  );
}
