"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { isPrivateRoute } from "./AnalyticsBeacon";

const GA_ID = "G-82JXWGW4GM";

/** GA4 loader gated to PUBLIC routes only (/, /share/*, /site/*, /forms/*).
 *  The signed-in dashboard shouldn't ship or execute a third-party analytics
 *  script on every session — it carries no product signal there and the
 *  co-located cookieless beacon already excludes it. Mirrors that split via
 *  isPrivateRoute so the two stay in sync. */
export function GoogleAnalytics() {
  const pathname = usePathname();
  if (!pathname || isPrivateRoute(pathname)) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');`}
      </Script>
    </>
  );
}
