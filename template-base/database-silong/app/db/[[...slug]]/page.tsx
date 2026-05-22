/**
 * Database Silong — catch-all route.
 *
 *  Single file routes the whole notion-canonical database surface:
 *
 *    /db                          → list all databases in active workspace
 *    /db/<dbId>                   → open database (default view)
 *    /db/<dbId>/view/<viewId>     → switch to specific view
 *    /db/<dbId>/row/<rowId>       → open row detail panel
 *    /db/new                      → create new database
 *
 *  Drop into consumer project at `app/db/[[...slug]]/page.tsx` and the
 *  whole UX works. Behind the scenes:
 *    - `NotionAppProvider` mounts higher in the layout (see WIRING.md)
 *    - `NotionDatabase` / `NotionDatabaseList` from @/slices/notion-database
 *      consume the NotionAdapter via context
 *    - Adapter implementation (Convex / localStorage / custom) is the
 *      ONLY swap point — UI code never changes
 *
 *  Mount path customisation: rename the directory (e.g. `app/workspace/db/`)
 *  and update WIRING.md's `routes.basePath` config to match.
 */

"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  NotionDatabase,
  NotionDatabaseList,
  NotionDatabaseNew,
  useNotionAdapter,
} from "@/slices/notion-database";

interface ParsedRoute {
  kind: "list" | "new" | "database" | "view" | "row";
  dbId?: string;
  viewId?: string;
  rowId?: string;
}

function parseSlug(slug: string[] | undefined): ParsedRoute {
  if (!slug || slug.length === 0) return { kind: "list" };
  if (slug[0] === "new") return { kind: "new" };

  const dbId = slug[0];
  if (slug.length === 1) return { kind: "database", dbId };

  if (slug[1] === "view" && slug[2]) {
    return { kind: "view", dbId, viewId: slug[2] };
  }
  if (slug[1] === "row" && slug[2]) {
    return { kind: "row", dbId, rowId: slug[2] };
  }

  return { kind: "database", dbId };
}

export default function DatabaseCatchAllRoute() {
  const params = useParams<{ slug?: string[] }>();
  const router = useRouter();
  const route = useMemo(() => parseSlug(params.slug), [params.slug]);
  const adapter = useNotionAdapter();

  if (!adapter) {
    return (
      <div className="p-8 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">
          NotionAdapter not mounted.
        </p>
        <p className="mt-2">
          Wrap your app in <code>&lt;NotionAppProvider adapter={"{...}"}&gt;</code>{" "}
          inside <code>app/layout.tsx</code>. See <code>WIRING.md</code>.
        </p>
      </div>
    );
  }

  switch (route.kind) {
    case "list":
      return (
        <NotionDatabaseList
          onOpen={(dbId) => router.push(`/db/${dbId}`)}
          onCreate={() => router.push("/db/new")}
        />
      );

    case "new":
      return (
        <NotionDatabaseNew
          onCreated={(dbId) => router.replace(`/db/${dbId}`)}
          onCancel={() => router.push("/db")}
        />
      );

    case "database":
      return (
        <NotionDatabase
          dbId={route.dbId!}
          onOpenRow={(rowId) => router.push(`/db/${route.dbId}/row/${rowId}`)}
          onSwitchView={(viewId) =>
            router.push(`/db/${route.dbId}/view/${viewId}`)
          }
        />
      );

    case "view":
      return (
        <NotionDatabase
          dbId={route.dbId!}
          activeViewId={route.viewId}
          onOpenRow={(rowId) => router.push(`/db/${route.dbId}/row/${rowId}`)}
          onSwitchView={(viewId) =>
            router.replace(`/db/${route.dbId}/view/${viewId}`)
          }
        />
      );

    case "row":
      return (
        <NotionDatabase
          dbId={route.dbId!}
          openRowId={route.rowId}
          onCloseRow={() => router.push(`/db/${route.dbId}`)}
          onOpenRow={(rowId) => router.replace(`/db/${route.dbId}/row/${rowId}`)}
          onSwitchView={(viewId) =>
            router.push(`/db/${route.dbId}/view/${viewId}`)
          }
        />
      );
  }
}
