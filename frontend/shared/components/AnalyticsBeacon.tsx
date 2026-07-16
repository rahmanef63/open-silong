"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

// Cookieless visitor beacon. Fires a `page_view` on every pathname change via
// navigator.sendBeacon → /api/analytics (which resolves geo from the IP then
// discards it). No cookie; sessionId is an ephemeral sessionStorage random —
// enough to count unique visits without a stable identity. UTM captured from the
// first URL that carries them and re-sent for the session. Skipped on the
// signed-in dashboard + non-page routes so only public marketing/share/site
// traffic is counted. Mounted once in the root layout (app/layout.tsx).

const SESSION_ID_KEY = "silong_sid";
const UTM_KEY = "silong_utm";
const UTM_FIELDS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const;
type UtmKey = (typeof UTM_FIELDS)[number];
type UtmBag = Partial<Record<UtmKey, string>>;

// The signed-in console (/dashboard) + auth/oauth/setup/api are private or
// non-page — never track them. Public surfaces (/, /share/*, /site/*, /forms/*)
// fall through and ARE tracked.
const SKIP = ["/dashboard", "/api", "/oauth", "/setup", "/auth", "/.well-known"];
/** True for private / non-page routes that should never be tracked or carry
 *  third-party analytics. Public surfaces (/, /share/*, /site/*, /forms/*)
 *  return false. Source of truth for the public/private split — reused by
 *  GoogleAnalytics so GA4 loads only where this beacon fires. */
export const isPrivateRoute = (p: string) => SKIP.some((s) => p === s || p.startsWith(s + "/"));
const skip = isPrivateRoute;

function viewportClass(): "mobile" | "tablet" | "desktop" {
  const w = window.innerWidth;
  return w < 640 ? "mobile" : w < 1024 ? "tablet" : "desktop";
}

function readSessionId(): string {
  try {
    const cur = sessionStorage.getItem(SESSION_ID_KEY);
    if (cur && /^[a-f0-9]{16}$/.test(cur)) return cur;
  } catch {
    /* sessionStorage blocked — mint a throwaway id */
  }
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const id = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  try {
    sessionStorage.setItem(SESSION_ID_KEY, id);
  } catch {
    /* storage blocked */
  }
  return id;
}

function readUtm(): UtmBag {
  try {
    const raw = sessionStorage.getItem(UTM_KEY);
    const p = raw ? (JSON.parse(raw) as UtmBag) : {};
    return p && typeof p === "object" ? p : {};
  } catch {
    return {};
  }
}

type Payload = {
  path: string;
  eventType: string;
  viewport: string;
  referrer?: string;
  sessionId?: string;
  properties?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
};

function send(p: Payload) {
  const body = JSON.stringify(p);
  try {
    if ("sendBeacon" in navigator) {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon("/api/analytics", blob)) return;
    }
  } catch {
    /* fall through to keepalive fetch */
  }
  fetch("/api/analytics", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}

// Module-level emit for in-page custom events: trackEvent("cta_click", { id }).
export function trackEvent(eventType: string, properties?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const path = window.location.pathname;
  if (skip(path)) return;
  const utm = readUtm();
  send({
    path,
    eventType,
    viewport: viewportClass(),
    referrer: document.referrer || undefined,
    sessionId: readSessionId(),
    properties:
      properties && Object.keys(properties).length
        ? JSON.stringify(properties).slice(0, 2000)
        : undefined,
    utmSource: utm.utm_source,
    utmMedium: utm.utm_medium,
    utmCampaign: utm.utm_campaign,
    utmTerm: utm.utm_term,
    utmContent: utm.utm_content,
  });
}

export function AnalyticsBeacon() {
  const pathname = usePathname();
  const lastSent = React.useRef<string | null>(null);

  // Capture utm_* from the landing URL. Reads window.location.search directly
  // (not useSearchParams) so a page mounting this never gets forced dynamic.
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const incoming: UtmBag = {};
    let any = false;
    for (const k of UTM_FIELDS) {
      const val = params.get(k);
      if (val) {
        incoming[k] = val.slice(0, 120);
        any = true;
      }
    }
    if (!any) return;
    try {
      sessionStorage.setItem(UTM_KEY, JSON.stringify({ ...readUtm(), ...incoming }));
    } catch {
      /* storage blocked */
    }
  }, [pathname]);

  React.useEffect(() => {
    if (!pathname || skip(pathname)) return;
    if (lastSent.current === pathname) return;
    lastSent.current = pathname;
    const fire = () => trackEvent("page_view");
    if ("requestIdleCallback" in window) {
      (window as unknown as { requestIdleCallback: (cb: () => void, o?: object) => void }).requestIdleCallback(fire, { timeout: 2000 });
    } else {
      setTimeout(fire, 1500);
    }
  }, [pathname]);

  return null;
}
