"use client";

import { useEffect, useRef } from "react";
import { useConvexAuth, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";

const FIVE_MIN = 5 * 60 * 1000;

/** Stamps `userProfiles.lastSeenAt = now` when called and again every
 *  5 minutes while mounted. Cheap; one mutation call max per window.
 *  Used by DashboardShell to power real DAU/WAU/MAU in admin overview.
 *  Skips when not authenticated. */
export function useTouchLastSeen() {
  const { isAuthenticated } = useConvexAuth();
  const touch = useMutation(api.users.touchLastSeen);
  const lastRef = useRef(0);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    const ping = () => {
      const now = Date.now();
      if (now - lastRef.current < FIVE_MIN) return;
      lastRef.current = now;
      touch().catch(() => { /* silent — best-effort telemetry */ });
    };
    ping();
    const id = window.setInterval(() => { if (!cancelled) ping(); }, FIVE_MIN);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [isAuthenticated, touch]);
}
