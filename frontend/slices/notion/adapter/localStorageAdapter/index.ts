"use client";

/**
 * Local-storage NotionAdapter — demo / portfolio / rr default.
 *
 * Pure-localStorage backend. Single hard-coded workspace
 * (`"default"`). All data lives in:
 *   - localStorage["silong-demo:pages"]     `{ [id]: Page }`
 *   - localStorage["silong-demo:databases"] `{ [id]: Database }`
 *   - localStorage["silong-demo:recents"]   `string[]`
 *
 * Reactivity: same-tab via custom `silong-demo:change` events,
 * cross-tab via the native `storage` event. `useSyncExternalStore`
 * under the hood (see `./store.ts`).
 *
 * Quota: 5–10 MB per origin (browser-dependent). Writes throw a
 * descriptive error on quota exceeded — consumers should expect
 * upload failures for large files (use a real adapter for prod).
 *
 * Optional namespaces shipped:
 *   - `recents` (push only, list via store)
 *   - `user` (single hard-coded demo user — "Demo user")
 *   - `workspaces` (single hard-coded workspace — "Default")
 *
 * Optional namespaces NOT shipped (consumer surfaces hide):
 *   - ai (no inference backend)
 *   - presence (single-tab only)
 *   - search (basic in-memory could be added Phase 6)
 *   - snapshots (defer to caller persistence)
 */

import { useCallback, useMemo } from "react";
import type { FilesAdapter } from "@/slices/files";
import { useLocalStorageFilesAdapter } from "@/slices/files/adapter/localStorageAdapter";
import type {
  NotionAdapter, RecentsAdapter, UserAdapter, WorkspacesAdapter,
} from "../types";
import { useLocalStoragePagesAdapter } from "./pages";
import { useLocalStorageDatabasesAdapter } from "./databases";
import {
  DEMO_WORKSPACE_ID, getRecents, setRecents, useDemoStore,
} from "./store";

const DEMO_USER = {
  id: "demo-user",
  email: "demo@example.com",
  name: "Demo user",
  icon: "🙂",
  bio: "",
  color: "#888",
  role: "owner" as const,
  isSuperAdmin: false,
};

const DEMO_WORKSPACE = {
  id: DEMO_WORKSPACE_ID,
  name: "Default",
  emoji: "🏠",
  slug: "default",
  isPersonal: true,
  role: "owner" as const,
};

function useRecentsLocal(): RecentsAdapter {
  const recents = useDemoStore<string[]>(useCallback(() => getRecents(), []));
  return useMemo<RecentsAdapter>(
    () => ({
      useList: () =>
        recents.map((targetId) => ({
          targetType: "page" as const,
          targetId,
          lastVisitedAt: Date.now(),
        })),
      push: async ({ targetId }) => {
        const cur = getRecents().filter((id) => id !== targetId);
        cur.unshift(targetId);
        setRecents(cur.slice(0, 20));
      },
    }),
    [recents],
  );
}

function useUserLocal(): UserAdapter {
  return useMemo<UserAdapter>(
    () => ({
      useCurrent: () => DEMO_USER,
      useById: (userId) => (userId === DEMO_USER.id ? DEMO_USER : null),
    }),
    [],
  );
}

function useWorkspacesLocal(): WorkspacesAdapter {
  return useMemo<WorkspacesAdapter>(
    () => ({
      useList: () => [DEMO_WORKSPACE],
      useActive: () => DEMO_WORKSPACE,
      setActive: async () => {
        // No-op — demo adapter is single-workspace.
      },
      create: async () => {
        throw new Error(
          "localStorageAdapter is single-workspace — wire a real " +
            "NotionAdapter (Convex or custom) for multi-workspace.",
        );
      },
    }),
    [],
  );
}

export function useLocalStorageNotionAdapter(): NotionAdapter {
  const pages = useLocalStoragePagesAdapter();
  const databases = useLocalStorageDatabasesAdapter();
  const files: FilesAdapter = useLocalStorageFilesAdapter();
  const recents = useRecentsLocal();
  const user = useUserLocal();
  const workspaces = useWorkspacesLocal();

  return useMemo<NotionAdapter>(
    () => ({
      pages, databases, files,
      recents, user, workspaces,
      // ai, presence, search, snapshots omitted — UI degrades.
    }),
    [pages, databases, files, recents, user, workspaces],
  );
}
