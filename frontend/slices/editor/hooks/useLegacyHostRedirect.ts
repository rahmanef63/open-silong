import { useEffect } from "react";
import { useNavigate } from "@/shared/lib/router";
import { ROUTES } from "@/shared/lib/routes";
import type { Database, Page } from "@/shared/types/domain";

/** Legacy host-page redirect — pages stamped with `databaseHostFor`
 *  used to be how full-page DBs rendered. Deprecated 2026-05-12;
 *  databases live at /dashboard/db/[id].
 *
 *  Marker-only: an earlier single-DB-block heuristic was dropped on
 *  2026-05-25 because it false-positived inline `/database` inserts on
 *  otherwise-empty pages — users got bounced to the full-page route the
 *  moment they spawned an inline DB. Pre-marker legacy host pages are
 *  rare (workspaces created before 2026-05-12); they no longer auto-
 *  redirect, but the database itself is still reachable via the sidebar
 *  Databases section and `/dashboard/db/:id`. */
export function legacyHostDbIdOf(page: Page | undefined): string | undefined {
  return page?.databaseHostFor?.[0];
}

export function useLegacyHostRedirect(
  legacyHostDbId: string | undefined,
  pageId: string | undefined,
  getDatabase: (id: string) => Database | undefined,
) {
  const navigate = useNavigate();
  useEffect(() => {
    if (!legacyHostDbId) return;
    const db = getDatabase(legacyHostDbId);
    if (!db || db.trashed) return; // wait for store or let user recover
    navigate(ROUTES.database(legacyHostDbId), { replace: true });
  }, [legacyHostDbId, pageId, getDatabase, navigate]);
}
