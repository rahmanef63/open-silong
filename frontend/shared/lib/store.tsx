import {
  useEffect, useMemo, useState, type ReactNode, useCallback,
} from "react";
import { useMutation, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@convex/_generated/api";
import type {
  Page, Workspace, UserProfile, Preferences, Database,
} from "@/shared/types/domain";
import { seedUser } from "@/shared/lib/seed";
import { Ctx, useStore, type StoreCtx } from "./store/context";
import { useHistoryStack } from "./store/history";
import { useSnapshots } from "./store/snapshots";
import { usePageActions } from "./store/pageActions";
import { useDatabaseActions } from "./store/databaseActions";
import { toPage, toDatabase } from "./store/mappers";
import { useWorkspaceMuts } from "./store/useWorkspaceMuts";

export { useStore };

export function StoreProvider({ children }: { children: ReactNode }) {
  const { signOut: authSignOut } = useAuthActions();

  // Slim listMeta excludes blocks/searchText/rowProps — 95% smaller payload
  // per keystroke. Editor pages subscribe individually via useFullPage(id).
  const rawPagesQ = useQuery(api.pages.listMeta);
  const rawDatabasesQ = useQuery(api.databases.list);
  const rawPages = rawPagesQ ?? [];
  const rawDatabases = rawDatabasesQ ?? [];
  const rawPrefs = useQuery(api.preferences.get);
  const rawWorkspace = useQuery(api.workspaces.getActive);
  const rawWorkspaces = useQuery(api.workspaces.list) ?? [];
  const rawRecents = useQuery(api.recents.get) ?? [];
  const isInitialLoading = rawPagesQ === undefined || rawDatabasesQ === undefined;

  const mutUpsertPrefs = useMutation(api.preferences.upsert);
  const mutEnsureBootstrap = useMutation(api.workspaces.ensureBootstrapped);

  // Derived collections
  const pages: Page[] = useMemo(() => rawPages.map(toPage), [rawPages]);
  const allDatabases: Database[] = useMemo(() => rawDatabases.map(toDatabase), [rawDatabases]);
  const databases: Database[] = useMemo(() => allDatabases.filter((d) => !d.trashed), [allDatabases]);
  const trashedDatabases: Database[] = useMemo(() => allDatabases.filter((d) => d.trashed), [allDatabases]);
  const recents: string[] = rawRecents;
  const pageMap = useMemo(() => new Map(pages.map((p) => [p.id, p])), [pages]);
  const databaseMap = useMemo(() => new Map(allDatabases.map((d) => [d.id, d])), [allDatabases]);

  const preferences: Preferences = useMemo(() => ({
    theme: (rawPrefs?.theme as any) ?? "system",
    sidebarDensity: (rawPrefs?.sidebarDensity as any) ?? "comfortable",
    defaultPageSort: (rawPrefs?.defaultPageSort as any) ?? "manual",
    editorBehavior: (rawPrefs?.editorBehavior as any) ?? "default",
    landingView: (rawPrefs?.landingView as any) ?? "dashboard",
    lastOpenedPageId: rawPrefs?.lastOpenedPageId ?? null,
  }), [rawPrefs]);

  const workspace: Workspace = useMemo(() => ({
    id: rawWorkspace?._id ?? "local",
    name: rawWorkspace?.name ?? "My Workspace",
    emoji: rawWorkspace?.emoji ?? "🏠",
    slug: rawWorkspace?.slug,
    isPersonal: rawWorkspace?.isPersonal,
    role: rawWorkspace?.role as Workspace["role"],
    themePresetId: rawWorkspace?.themePresetId,
    themeMode: rawWorkspace?.themeMode as Workspace["themeMode"],
  }), [rawWorkspace]);

  const workspaces: Workspace[] = useMemo(
    () => rawWorkspaces.map((w) => ({
      id: w._id, name: w.name, emoji: w.emoji, slug: w.slug,
      isPersonal: w.isPersonal, role: w.role as Workspace["role"],
    })),
    [rawWorkspaces],
  );

  const me = useQuery(api.users.getMe);
  const [user, setUser] = useState<UserProfile>(seedUser);
  useEffect(() => {
    if (!me) return;
    setUser((prev) => ({
      ...prev, id: String(me._id), name: me.displayName, email: me.email ?? prev.email,
    }));
  }, [me]);

  // useThemeEffect removed — next-themes' ThemeProvider (mounted in
  // app/providers.tsx with attribute="class") now owns the .dark class.
  // DashboardShell's ThemeBridge syncs preferences.theme ↔ next-themes.

  const history = useHistoryStack();
  const snapshotsApi = useSnapshots(user.name);

  const pageActions = usePageActions({
    pages, pageMap, preferences,
    snapshotIfNeeded: snapshotsApi.snapshotIfNeeded,
    pushStructuralAction: history.pushStructuralAction,
  });

  const databaseActions = useDatabaseActions({
    databaseMap, pageMap, pushStructuralAction: history.pushStructuralAction,
  });

  const updateUser = useCallback((patch: Partial<UserProfile>) => {
    setUser((u) => ({ ...u, ...patch }));
  }, []);

  const updatePreferences = useCallback(
    (patch: Partial<Preferences>) => { mutUpsertPrefs({ patch }); },
    [mutUpsertPrefs],
  );

  const workspaceMuts = useWorkspaceMuts(workspace);

  // First-load bootstrap: ensure user has a personal workspace + active selection
  // before any pages.list query runs against an empty active. Cheap idempotent
  // mutation; runs once per mount when authed.
  useEffect(() => {
    if (!me) return;
    if (rawWorkspace !== null) return;
    void mutEnsureBootstrap({});
  }, [me, rawWorkspace, mutEnsureBootstrap]);

  const signOut = useCallback(() => { authSignOut(); }, [authSignOut]);

  const value: StoreCtx = useMemo(
    () => ({
      user, updateUser,
      preferences, updatePreferences,
      workspace,
      ...workspaceMuts,
      workspaces,
      pages, recents,
      ...pageActions,
      saving: false,
      isInitialLoading,
      databases, trashedDatabases,
      ...databaseActions,
      snapshots: snapshotsApi.snapshots,
      snapshotsForPage: snapshotsApi.snapshotsForPage,
      restoreSnapshot: snapshotsApi.restoreSnapshot,
      undo: history.undo,
      redo: history.redo,
      canUndo: history.canUndo,
      canRedo: history.canRedo,
      signOut,
    }),
    [
      user, updateUser, preferences, updatePreferences, workspace, workspaceMuts,
      workspaces, pages, recents, pageActions, isInitialLoading,
      databases, trashedDatabases, databaseActions,
      snapshotsApi, history, signOut,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// Per-domain selector hooks — opt-in narrower API over the monolithic
// useStore(). See ./store/hooks.ts.
export {
  useUser,
  usePreferences,
  useWorkspaces,
  usePages,
  useRecents,
  useBlocks,
  useDatabases,
  useDatabaseProperties,
  useDatabaseRows,
  useDatabaseViews,
  useSnapshotsStore,
  useUndoRedo,
  useAuth,
} from "./store/hooks";
