"use client";

import { useMemo } from "react";
import { useParams, useNavigate } from "@/shared/lib/router";
import { ROUTES } from "@/shared/lib/routes";
import { useDbAdapter } from "./lib/useDbAdapter";
import { DatabaseBlock } from "./DatabaseBlock";
import { DatabaseSkeleton } from "@/shared/components/RouteSkeleton";
import { PageHeaderSlot } from "@/shared/components/PageHeaderSlot";
import { DynamicIcon } from "@/shared/components/icon-picker";
import { DEFAULT_DATABASE_ICON } from "@/shared/components/icon-picker";
import { Button } from "@/shared/ui/button";
import type { Block } from "@/shared/types/domain";

/**
 * Full-page database route. Renders a database as a first-class entity
 * — NOT inside a host page. The legacy "host page" concept (a regular
 * page whose only block was a database, marked via databaseHostFor) is
 * deprecated as of 2026-05-12. Databases live at /dashboard/db/[id].
 *
 * Why split: pages have blocks, databases have rows. They're different
 * shapes that don't compose. Putting a database inside a page-as-block
 * created edge cases where the host page's blocks could be deleted,
 * leaving the marker pointing at an empty page — exactly the bug that
 * triggered this refactor.
 */
export function DatabasePage() {
  const { id } = useParams<{ id: string }>();
  const { getDatabase } = useDbAdapter();
  const navigate = useNavigate();
  const db = id ? getDatabase(id) : undefined;
  // `recents.pageIds[]` is `Id<"pages">[]` — pushing a database id
  // would fail the Convex validator. Database recents need their
  // own table; until then, DB visits don't surface in the Recents
  // dashboard.

  // Synthetic block — DatabaseBlock's prop shape is page-block-oriented,
  // but here we have a dbId directly. The block is never written to
  // anything; it's a render-time vehicle only.
  const block: Block = useMemo(
    () => ({ id: `__fullpage_${id}__`, type: "database", text: "", databaseId: id ?? "" }),
    [id],
  );

  if (!id) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No database id.
      </div>
    );
  }

  if (db === undefined) {
    // Loading — store hasn't resolved this DB yet.
    return <DatabaseSkeleton />;
  }

  if (db === null) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
        <div>Database not found.</div>
        <Button
          variant="outline"
          type="button"
          onClick={() => navigate(ROUTES.dashboard)}
          className="h-auto rounded-md px-3 py-1.5 text-sm font-normal"
        >
          Back to dashboard
        </Button>
      </div>
    );
  }

  if (db.trashed) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-sm">
        <div className="font-medium text-amber-700 dark:text-amber-400">
          Database is in Trash
        </div>
        <Button
          variant="outline"
          type="button"
          onClick={() => navigate(ROUTES.trash)}
          className="h-auto rounded-md px-3 py-1.5 text-sm font-normal"
        >
          Open Trash
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeaderSlot
        left={
          <div className="flex items-center gap-1.5 min-w-0">
            <DynamicIcon
              value={db.icon}
              fallback={DEFAULT_DATABASE_ICON}
              className="text-base shrink-0"
            />
            <span className="truncate text-sm font-medium">
              {db.name || "Untitled database"}
            </span>
          </div>
        }
      />
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="mx-auto max-w-none px-4 sm:px-6 md:px-12 pt-6 pb-12">
          <DatabaseBlock pageId="" block={block} fullPage />
        </div>
      </div>
    </div>
  );
}
