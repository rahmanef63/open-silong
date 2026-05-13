import { useEffect } from "react";
import { useNavigate } from "@/shared/lib/router";
import { ROUTES } from "@/shared/lib/routes";
import type { Database, Page } from "@/shared/types/domain";

/** Legacy host-page redirect — pages stamped with `databaseHostFor` (or
 *  pre-marker single-DB-block heuristic) used to be how full-page DBs
 *  rendered. Deprecated 2026-05-12; databases live at /dashboard/db/[id]. */
export function legacyHostDbIdOf(page: Page | undefined): string | undefined {
  const hosted = page?.databaseHostFor?.[0];
  if (hosted) return hosted;
  const onlyBlock = page?.blocks.length === 1 ? page.blocks[0] : null;
  if (onlyBlock?.type === "database" && onlyBlock.databaseId) {
    return onlyBlock.databaseId;
  }
  return undefined;
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
