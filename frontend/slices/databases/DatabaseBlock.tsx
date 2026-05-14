import { Suspense, useState } from "react";
import { Link, useNavigate } from "@/shared/lib/router";
import { ROUTES } from "@/shared/lib/routes";
import { Block } from "@/shared/types/domain";
import { useStore } from "@/shared/lib/store";
import { RowPeek } from "./row";
import { DatabaseSkeleton } from "@/shared/components/RouteSkeleton";
import { ErrorBoundary } from "@/shared/components/ErrorBoundary";
import {
  RowSelectionProvider, RowSelectionToolbar, RowSelectionKeyboard,
} from "./row-selection";
import { VIEW_COMPONENTS } from "./database-block/lazyViews";
import { useDatabaseRows, useFilteredRows, useIsLinked } from "./database-block/useFilteredRows";
import { DatabaseHeaderBar } from "./database-block/HeaderBar";
import { DatabaseToolbar } from "./database-block/Toolbar";

import { PROPERTY_TYPE_LABELS } from "./lib/propertyTypeMeta";
export { PROPERTY_TYPE_LABELS };

export function DatabaseBlock({
  pageId,
  block,
  fullPage = false,
}: {
  pageId: string;
  block: Block;
  /** When true, render as the full-page database view: hides the
   *  "Open as page" button and treats the surface as the canonical
   *  home of the DB (no host page concept). Used by `/dashboard/db/[id]`. */
  fullPage?: boolean;
}) {
  const { getDatabase, pages, updateBlock, updateDatabase } = useStore();
  const navigate = useNavigate();
  const [openRowId, setOpenRowId] = useState<string | null>(null);

  const db = block.databaseId ? getDatabase(block.databaseId) : undefined;
  // Linked-view per-block override: prefer block.activeViewId so two
  // linked instances of the same DB can show different view tabs.
  const activeViewId = block.activeViewId ?? db?.activeViewId;
  const view = db ? db.views.find((v) => v.id === activeViewId) ?? db.views[0] : undefined;
  const rows = useDatabaseRows(db, pages);
  const filtered = useFilteredRows(rows, view);

  // "Inline" means embedded in a regular page's block stream. Full-page
  // route forces isInline=false so the "Open as page" button hides
  // (you're already there). Databases live at /db/[id]; the legacy
  // "host page" concept (page with single database block + databaseHostFor
  // marker) is deprecated — openAsPage navigates to /db/.
  const isInline = fullPage ? false : true;
  const isLinked = useIsLinked(db, pages, isInline);

  // Inline / linked instances persist active-view to the block; the
  // canonical (full-page) view writes to the database so its default
  // is shared across the workspace.
  const onActivateView = (viewId: string) => {
    if (isInline) updateBlock(pageId, block.id, { activeViewId: viewId });
    else if (db) updateDatabase(db.id, { activeViewId: viewId });
  };

  if (block.databaseId && !db) {
    return <DatabaseSkeleton />;
  }
  if (db?.trashed) {
    return (
      <div className="rounded-lg border border-dashed border-amber-500/40 bg-amber-500/5 p-6 text-center text-sm">
        <div className="font-medium text-amber-700 dark:text-amber-400">Database moved to Trash</div>
        <div className="mt-1 text-xs text-muted-foreground">
          Restore from <Link to={ROUTES.trash} className="underline">Trash</Link> to view it again.
        </div>
      </div>
    );
  }
  if (!db || !view) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Database not found.
      </div>
    );
  }

  function openAsPage() {
    if (!db) return;
    navigate(ROUTES.database(db.id));
  }

  const ViewComponent = VIEW_COMPONENTS[view.type];

  return (
    <div data-keyboard-scope data-database-block-root className="rounded-lg border border-border bg-card">
      <DatabaseHeaderBar
        db={db}
        view={view}
        rows={filtered}
        isInline={isInline}
        isLinked={isLinked}
        onOpenAsPage={openAsPage}
        activeViewId={activeViewId}
        onActivateView={onActivateView}
      />
      <DatabaseToolbar db={db} view={view} />

      <RowSelectionProvider rowOrder={filtered.map((r) => r.id)}>
        <RowSelectionToolbar databaseId={db.id} />
        <RowSelectionKeyboard databaseId={db.id} />
        <ErrorBoundary>
          <Suspense fallback={<DatabaseSkeleton />}>
            <ViewComponent db={db} view={view} rows={filtered} onOpenRow={setOpenRowId} />
          </Suspense>
        </ErrorBoundary>
      </RowSelectionProvider>
      <RowPeek
        pageId={openRowId}
        onOpenChange={(o) => !o && setOpenRowId(null)}
        showOpenAsPage={isInline}
      />
    </div>
  );
}
