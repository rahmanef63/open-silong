"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/shared/lib/store";
import { Dashboard } from "@/slices/dashboard/views/Dashboard";

export default function DashboardIndexPage() {
  const router = useRouter();
  const { preferences, pages, recents, getPage } = useStore();

  useEffect(() => {
    switch (preferences.landingView) {
      case "last": {
        const last = preferences.lastOpenedPageId ? getPage(preferences.lastOpenedPageId) : undefined;
        if (last && !last.trashed) router.replace(`/dashboard/p/${last.id}`);
        return;
      }
      case "recent": {
        if (recents[0]) router.replace(`/dashboard/p/${recents[0]}`);
        return;
      }
      case "favorites": {
        const fav = pages.find((p) => p.favorite && !p.trashed);
        if (fav) router.replace(`/dashboard/p/${fav.id}`);
        return;
      }
      default:
        return;
    }
    // run only on mount — preference-driven landing redirect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <Dashboard />;
}
