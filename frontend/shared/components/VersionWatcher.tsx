"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";

const POLL_MS = 5 * 60 * 1000; // 5 minutes
const TOAST_ID = "nosion:version-update";

/** Polls `/api/version` and prompts the user to reload when the deployed
 *  build id no longer matches the build the client booted with. Prevents
 *  the "Failed to load chunk /_next/static/chunks/<hash>.js" class of
 *  errors that happen when a long-lived tab tries to lazy-load a chunk
 *  filename that no longer exists on the server.
 *
 *  Mount once near the root (Providers tree). No-op when no BUILD_ID is
 *  available (e.g. local dev without env). */
export function VersionWatcher() {
  const bootBuildId = process.env.NEXT_PUBLIC_BUILD_ID;
  const promptedRef = useRef(false);

  useEffect(() => {
    if (!bootBuildId) return;

    let stopped = false;

    async function check() {
      if (stopped || promptedRef.current) return;
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok) return;
        const { buildId } = (await res.json()) as { buildId: string };
        if (buildId && buildId !== bootBuildId) {
          promptedRef.current = true;
          toast.message("New version available", {
            id: TOAST_ID,
            description: "Reload to load the latest update.",
            duration: Infinity,
            icon: <RefreshCw className="h-4 w-4" />,
            action: {
              label: "Reload",
              onClick: () => hardReload(),
            },
          });
        }
      } catch {
        // Network blip — try again next tick.
      }
    }

    const interval = window.setInterval(check, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", check);
    // Initial probe shortly after mount (tab restored from bf-cache, etc).
    const t = window.setTimeout(check, 1500);

    return () => {
      stopped = true;
      window.clearInterval(interval);
      window.clearTimeout(t);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", check);
    };
  }, [bootBuildId]);

  return null;
}

/** Hard-reload that defeats HTTP cache. Adds a transient query string so
 *  the HTML response is fetched fresh from origin (Cloudflare / Traefik /
 *  service worker won't be tempted to serve a stale copy). */
export function hardReload() {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set("_v", String(Date.now()));
    window.location.replace(url.toString());
  } catch {
    window.location.reload();
  }
}
