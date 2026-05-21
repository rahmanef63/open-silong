"use client";

/**
 * Production NotionAdapter for self-hosted Convex.
 *
 * Composes per-namespace adapters (pages, databases, files,
 * optional capabilities) into the single `NotionAdapter` consumed by
 * `<NotionAdapterProvider>`.
 *
 * Requires that BOTH `<ConvexAuthNextjsProvider>` AND the existing
 * `StoreProvider` are mounted upstream — every sub-adapter calls
 * `useMutation` / `useQuery` / `useStore` internally.
 *
 * SKIP-LISTED: `rr-sync.json.skipFiles` includes `convexAdapter`
 * so this entire directory is excluded when the mega-slice is
 * lifted to rr. rr ships `useLocalStorageNotionAdapter` as the
 * default.
 */

import { useMemo } from "react";
// Deep import of the Convex impl is intentional (same pattern as
// `app/providers.tsx` mounting the production FilesAdapter). The files
// slice barrel only exports the generic FilesAdapterProvider + hook,
// not the Convex-backed impl.
// eslint-disable-next-line no-restricted-imports
import { useConvexFilesAdapter } from "@/slices/files/adapter/convexAdapter";
import type { NotionAdapter } from "../types";
import { useConvexPagesAdapter } from "./pages";
import { useConvexDatabasesAdapter } from "./databases";
import {
  useConvexAiAdapter,
  useConvexPresenceAdapter,
  useConvexRecentsAdapter,
  useConvexSnapshotsAdapter,
  useConvexUserAdapter,
  useConvexWorkspacesAdapter,
} from "./optional";

export function useConvexNotionAdapter(): NotionAdapter {
  const pages = useConvexPagesAdapter();
  const databases = useConvexDatabasesAdapter();
  const files = useConvexFilesAdapter();
  const ai = useConvexAiAdapter();
  const presence = useConvexPresenceAdapter();
  const user = useConvexUserAdapter();
  const workspaces = useConvexWorkspacesAdapter();
  const recents = useConvexRecentsAdapter();
  const snapshots = useConvexSnapshotsAdapter();

  return useMemo<NotionAdapter>(
    () => ({
      pages,
      databases,
      files,
      ai,
      presence,
      user,
      workspaces,
      recents,
      snapshots,
      // search omitted — convex search lives in `convex/search.ts`
      // but the editor doesn't consume it directly yet. Phase 2 may
      // wire it when the search slice migrates.
    }),
    [pages, databases, files, ai, presence, user, workspaces, recents, snapshots],
  );
}
