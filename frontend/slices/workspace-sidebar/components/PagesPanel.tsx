"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { DndContext, DragOverlay } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useStore } from "@/shared/lib/store";
import { Page } from "@/shared/types/domain";
import { cn } from "@/shared/lib/utils";
import {
  DENSITY, SidebarPageLink, DatabaseSidebarRow,
  SortablePageRow, DragGhost, PageRowSkeleton, useSidebarDnd, type TreeItem,
} from "@/slices/workspace-sidebar";
import {
  SidebarGroup, SidebarGroupAction, SidebarGroupContent, SidebarGroupLabel,
} from "@/shared/ui/sidebar";
import { usePageCRUD } from "../hooks/usePageCRUD";
import { useDatabaseCRUD } from "../hooks/useDatabaseCRUD";
import { CreatePageDialog } from "./dialogs/CreatePageDialog";
import { DeletePageDialog } from "./dialogs/DeletePageDialog";
import { CreateDatabaseDialog } from "./dialogs/CreateDatabaseDialog";

interface Props {
  /** Called after navigation/creation — used by mobile sheet to close itself. */
  onClose?: () => void;
}

const BASE = "/dashboard";
const path = (p: string) => (p === "/" ? BASE : `${BASE}${p}`);

/**
 * Pages tree (Favorites, Recent, Workspace, Databases) as flat sections.
 * Renders no outer wrapper / scroller / footer — host (AppSidebar) owns those.
 */
export function PagesPanel({ onClose }: Props) {
  const {
    pages, recents, childrenOf, preferences, databases, isInitialLoading,
  } = useStore();
  const router = useRouter();
  const pathname = usePathname() ?? BASE;
  const pageCRUD = usePageCRUD();
  const dbCRUD = useDatabaseCRUD();
  const density = DENSITY[preferences.sidebarDensity];
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [treeInitialized, setTreeInitialized] = useState(false);

  const favorites = pages.filter((p) => p.favorite && !p.trashed && !p.rowOfDatabaseId);
  const recentPages = recents
    .map((id) => pages.find((p) => p.id === id))
    .filter((p): p is Page => !!p && !p.trashed && !p.rowOfDatabaseId);
  const rootPages = childrenOf(null);

  useEffect(() => {
    if (treeInitialized || rootPages.length === 0) return;
    setOpenIds(new Set(
      rootPages.filter((p) => childrenOf(p.id).length > 0).map((p) => p.id),
    ));
    setTreeInitialized(true);
  }, [treeInitialized, rootPages, childrenOf]);

  const pageMap = useMemo(() => new Map(pages.map((p) => [p.id, p])), [pages]);

  /** parentId → children count. Computed once per pages change instead of
   *  per-row .filter() in SortablePageRow. */
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
    const walk = (parentId: string | null, depth: number): TreeItem[] =>
      childrenOf(parentId).flatMap((page) => {
        const item = { page, depth, parentId };
        return openIds.has(page.id) ? [item, ...walk(page.id, depth + 1)] : [item];
      });
    return walk(null, 0);
  }, [childrenOf, openIds]);

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

  function openNewPage(parentId: string | null = null) {
    pageCRUD.openCreate(parentId);
  }

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
      {favorites.length > 0 && (
        <SidebarGroup>
          <SidebarGroupLabel>Favorites</SidebarGroupLabel>
          <SidebarGroupContent>
            {favorites.map((page) => (
              <SidebarPageLink
                key={page.id}
                page={page}
                density={density}
                onClose={onClose}
                active={pathname === path(`/p/${page.id}`)}
              />
            ))}
          </SidebarGroupContent>
        </SidebarGroup>
      )}

      {recentPages.length > 0 && (
        <SidebarGroup>
          <SidebarGroupLabel>Recent</SidebarGroupLabel>
          <SidebarGroupContent>
            {recentPages.map((page) => (
              <SidebarPageLink
                key={page.id}
                page={page}
                density={density}
                onClose={onClose}
                active={pathname === path(`/p/${page.id}`)}
              />
            ))}
          </SidebarGroupContent>
        </SidebarGroup>
      )}

      <SidebarGroup
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("application/x-page-id")) {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
          }
        }}
        onDrop={(e) => dnd.handleNativeDropOnPage(null, e)}
      >
        <SidebarGroupLabel>Workspace</SidebarGroupLabel>
        <SidebarGroupAction
          onClick={() => openNewPage(null)}
          aria-label="New page"
          title="New page"
        >
          <Plus />
        </SidebarGroupAction>
        <SidebarGroupContent>
        <DndContext
          sensors={dnd.sensors}
          collisionDetection={dnd.collisionDetection}
          modifiers={dnd.modifiers}
          onDragStart={dnd.onDragStart}
          onDragMove={dnd.onDragMove}
          onDragEnd={dnd.onDragEnd}
          onDragCancel={dnd.onDragCancel}
        >
          <div
            className="overflow-x-hidden"
            onDragOver={(e) => {
              if (e.dataTransfer.types.includes("application/x-page-id")) {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }
            }}
          >
            <SortableContext items={dnd.treeIds} strategy={verticalListSortingStrategy}>
              {treeItems.map((item) => (
                <SortablePageRow
                  key={item.page.id}
                  item={item}
                  density={density}
                  isOpen={openIds.has(item.page.id)}
                  setOpen={(open) => setPageOpen(item.page.id, open)}
                  onClose={onClose}
                  onRequestDelete={(p) => pageCRUD.openDelete(p.id)}
                  kidsCount={childrenCounts.get(item.page.id) ?? 0}
                  isOverSibling={dnd.overId === item.page.id && !dnd.nestIntent && dnd.activeId !== null}
                  isOverNesting={dnd.overId === item.page.id && dnd.nestIntent && dnd.activeId !== null}
                  isExternalOver={dnd.externalOverId === item.page.id}
                  onExternalEnter={() => dnd.setExternalOverId(item.page.id)}
                  onExternalLeave={() => dnd.setExternalOverId((cur) => (cur === item.page.id ? null : cur))}
                  onExternalDrop={(e) => dnd.handleNativeDropOnPage(item.page.id, e)}
                />
              ))}
            </SortableContext>
          </div>
          <DragOverlay dropAnimation={{ duration: 150, easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)" }}>
            {dnd.activeDraggedItem ? <DragGhost item={dnd.activeDraggedItem} density={density} /> : null}
          </DragOverlay>
        </DndContext>
          {rootPages.length === 0 && (
            <button
              type="button"
              onClick={() => openNewPage(null)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 text-muted-foreground hover:bg-sidebar-accent",
                density.pageLink,
              )}
            >
              <Plus className="h-3.5 w-3.5" /> New page
            </button>
          )}
        </SidebarGroupContent>
      </SidebarGroup>

      {databases.length > 0 && (
        <SidebarGroup>
          <SidebarGroupLabel>Databases</SidebarGroupLabel>
          <SidebarGroupAction
            onClick={() => dbCRUD.openCreate()}
            aria-label="New database"
            title="New database"
          >
            <Plus />
          </SidebarGroupAction>
          <SidebarGroupContent>
            {databases.map((db) => (
              <DatabaseSidebarRow key={db.id} db={db} density={density} />
            ))}
          </SidebarGroupContent>
        </SidebarGroup>
      )}

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

