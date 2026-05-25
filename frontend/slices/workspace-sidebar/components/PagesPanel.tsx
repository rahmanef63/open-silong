"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useStore } from "@/shared/lib/store";
import { Page } from "@/shared/types/domain";
import {
  DENSITY, PageRowSkeleton, useSidebarDnd, type TreeItem,
} from "@/slices/workspace-sidebar";
import {
  SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
} from "@/shared/ui/sidebar";
import { usePageCRUD } from "../hooks/usePageCRUD";
import { useDatabaseCRUD } from "../hooks/useDatabaseCRUD";
import { CreatePageDialog } from "./dialogs/CreatePageDialog";
import { DeletePageDialog } from "./dialogs/DeletePageDialog";
import { CreateDatabaseDialog } from "./dialogs/CreateDatabaseDialog";
import { FavoritesSection, RecentSection, DatabasesSection } from "./pages-panel/Sections";
import { WorkspaceTree } from "./pages-panel/WorkspaceTree";

interface Props {
  /** Called after navigation/creation — used by mobile sheet to close itself. */
  onClose?: () => void;
}

import { ROUTE_BASE } from "@/shared/lib/routes";

const path = (p: string) => (p === "/" ? ROUTE_BASE : `${ROUTE_BASE}${p}`);

/**
 * Pages tree (Favorites, Recent, Workspace, Databases) as flat sections.
 * Renders no outer wrapper / scroller / footer — host (AppSidebar) owns those.
 */
export function PagesPanel({ onClose }: Props) {
  const {
    pages, recents, childrenOf, preferences, databases, isInitialLoading,
  } = useStore();
  const router = useRouter();
  const pathname = usePathname() ?? ROUTE_BASE;
  const pageCRUD = usePageCRUD();
  const dbCRUD = useDatabaseCRUD();
  const density = DENSITY[preferences.sidebarDensity];
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [treeInitialized, setTreeInitialized] = useState(false);
  const [pagesExpanded, setPagesExpanded] = useState(false);
  const [dbsExpanded, setDbsExpanded] = useState(false);

  const favorites = pages.filter((p) => p.favorite && !p.trashed && !p.rowOfDatabaseId);
  const recentPages = recents
    .map((id) => pages.find((p) => p.id === id))
    .filter((p): p is Page => !!p && !p.trashed && !p.rowOfDatabaseId);
  const rootPages = childrenOf(null);
  const SIDEBAR_LIMIT = 10;
  const visibleRootPages = pagesExpanded ? rootPages : rootPages.slice(0, SIDEBAR_LIMIT);
  const visibleRootIds = useMemo(
    () => new Set(visibleRootPages.map((p) => p.id)),
    [visibleRootPages],
  );

  useEffect(() => {
    if (treeInitialized || rootPages.length === 0) return;
    setOpenIds(new Set(
      rootPages.filter((p) => childrenOf(p.id).length > 0).map((p) => p.id),
    ));
    setTreeInitialized(true);
  }, [treeInitialized, rootPages, childrenOf]);

  const pageMap = useMemo(() => new Map(pages.map((p) => [p.id, p])), [pages]);

  const childrenCounts = useMemo(() => {
    const m = new Map<string | null, number>();
    for (const p of pages) {
      if (p.trashed || p.rowOfDatabaseId) continue;
      const k = p.parentId;
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  }, [pages]);

  const treeItems = useMemo(() => {
    const walk = (parentId: string | null, depth: number): TreeItem[] => {
      const kids = parentId === null
        ? childrenOf(null).filter((p) => visibleRootIds.has(p.id))
        : childrenOf(parentId);
      return kids.flatMap((page) => {
        const item = { page, depth, parentId };
        return openIds.has(page.id) ? [item, ...walk(page.id, depth + 1)] : [item];
      });
    };
    return walk(null, 0);
  }, [childrenOf, openIds, visibleRootIds]);

  const itemById = useMemo(() => new Map(treeItems.map((i) => [i.page.id, i])), [treeItems]);

  const setPageOpen = (id: string, open: boolean) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (open) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const dnd = useSidebarDnd({ treeItems, pageMap, itemById, setPageOpen });

  function go(p: string) {
    router.push(path(p));
    onClose?.();
  }
  void go;

  if (isInitialLoading) {
    return (
      <div data-keyboard-scope>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <PageRowSkeleton count={6} />
          </SidebarGroupContent>
        </SidebarGroup>
      </div>
    );
  }

  return (
    <div data-keyboard-scope>
      <FavoritesSection pages={favorites} density={density} pathname={pathname} basePath={path} onClose={onClose} />
      <RecentSection pages={recentPages} density={density} pathname={pathname} basePath={path} onClose={onClose} />
      <WorkspaceTree
        treeItems={treeItems}
        density={density}
        openIds={openIds}
        setPageOpen={setPageOpen}
        childrenCounts={childrenCounts}
        rootPages={rootPages}
        dnd={dnd}
        onClose={onClose}
        onRequestDelete={(p) => pageCRUD.openDelete(p.id)}
        onNewPage={() => pageCRUD.openCreate(null)}
        overflowCount={Math.max(0, rootPages.length - SIDEBAR_LIMIT)}
        overflowExpanded={pagesExpanded}
        onToggleOverflow={() => setPagesExpanded((v) => !v)}
      />
      <DatabasesSection
        databases={databases}
        density={density}
        onCreate={() => dbCRUD.openCreate()}
        limit={SIDEBAR_LIMIT}
        expanded={dbsExpanded}
        onToggleExpanded={() => setDbsExpanded((v) => !v)}
      />

      <CreatePageDialog
        open={pageCRUD.createOpen}
        onOpenChange={pageCRUD.setCreateOpen}
        parentId={pageCRUD.createParentId}
        onSubmit={async (data) => {
          await pageCRUD.handleCreateSubmit(data);
          if (data.parentId) setPageOpen(data.parentId, true);
          onClose?.();
        }}
      />
      <DeletePageDialog
        open={pageCRUD.deleteOpen}
        onOpenChange={pageCRUD.setDeleteOpen}
        page={pageCRUD.deleteTarget}
        onConfirm={pageCRUD.handleDeleteConfirm}
      />
      <CreateDatabaseDialog
        open={dbCRUD.createOpen}
        onOpenChange={dbCRUD.setCreateOpen}
        onSubmit={async (data) => {
          await dbCRUD.handleCreateSubmit(data);
          onClose?.();
        }}
      />
    </div>
  );
}
