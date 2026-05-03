"use client";

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "@/shared/lib/router-compat";
import { Plus } from "lucide-react";
import { DndContext, DragOverlay } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useStore } from "@/shared/lib/store";
import { Page } from "@/shared/types/domain";
import { cn } from "@/shared/lib/utils";
import {
  DENSITY, SidebarPageLink, DatabaseSidebarRow,
  SortablePageRow, DragGhost, useSidebarDnd, type TreeItem,
} from "@/slices/workspace-sidebar";

interface Props {
  /** Called after navigation/creation — used by mobile sheet to close itself. */
  onClose?: () => void;
}

/**
 * Pages tree (Favorites, Recent, Workspace, Databases) as flat sections.
 * Renders no outer wrapper / scroller / footer — host (AppSidebar) owns those.
 */
export function PagesPanel({ onClose }: Props) {
  const {
    pages, recents, childrenOf, createPage, preferences,
    databases, createDatabase, addBlock, updateBlock,
  } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
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
    navigate(p);
    onClose?.();
  }

  async function handleNew(parentId: string | null = null) {
    const page = await createPage(parentId);
    if (parentId) setPageOpen(parentId, true);
    go(`/p/${page.id}`);
  }

  return (
    <div data-keyboard-scope className="space-y-3 px-2">
      {favorites.length > 0 && (
        <PanelGroup label="Favorites">
          {favorites.map((page) => (
            <SidebarPageLink
              key={page.id}
              page={page}
              density={density}
              onClose={onClose}
              active={location.pathname === `/p/${page.id}`}
            />
          ))}
        </PanelGroup>
      )}

      {recentPages.length > 0 && (
        <PanelGroup label="Recent">
          {recentPages.map((page) => (
            <SidebarPageLink
              key={page.id}
              page={page}
              density={density}
              onClose={onClose}
              active={location.pathname === `/p/${page.id}`}
            />
          ))}
        </PanelGroup>
      )}

      <PanelGroup
        label="Workspace"
        action={
          <button
            type="button"
            onClick={() => handleNew(null)}
            aria-label="New page"
            title="New page"
            className="grid place-items-center size-5 rounded text-muted-foreground hover:bg-sidebar-accent"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        }
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("application/x-page-id")) {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
          }
        }}
        onDrop={(e) => dnd.handleNativeDropOnPage(null, e)}
      >
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
            onClick={() => handleNew(null)}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2 text-muted-foreground hover:bg-sidebar-accent",
              density.pageLink,
            )}
          >
            <Plus className="h-3.5 w-3.5" /> New page
          </button>
        )}
      </PanelGroup>

      {databases.length > 0 && (
        <PanelGroup
          label="Databases"
          action={
            <button
              type="button"
              onClick={async () => {
                const [p, db] = await Promise.all([
                  createPage(null, { title: "Untitled database", icon: "🗂️" }),
                  createDatabase("Untitled database"),
                ]);
                const blockId = await addBlock(p.id, 0, "database");
                updateBlock(p.id, blockId, { databaseId: db.id });
                go(`/p/${p.id}`);
              }}
              aria-label="New database"
              title="New database"
              className="grid place-items-center size-5 rounded text-muted-foreground hover:bg-sidebar-accent"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          }
        >
          {databases.map((db) => (
            <DatabaseSidebarRow key={db.id} db={db} density={density} />
          ))}
        </PanelGroup>
      )}
    </div>
  );
}

interface PanelGroupProps {
  label: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  onDragOver?: React.DragEventHandler<HTMLDivElement>;
  onDrop?: React.DragEventHandler<HTMLDivElement>;
}

function PanelGroup({ label, action, children, onDragOver, onDrop }: PanelGroupProps) {
  return (
    <section onDragOver={onDragOver} onDrop={onDrop}>
      <header className="flex h-7 items-center justify-between px-1">
        <span className="text-[11px] font-medium uppercase tracking-wider text-sidebar-foreground/60">
          {label}
        </span>
        {action}
      </header>
      <div>{children}</div>
    </section>
  );
}
