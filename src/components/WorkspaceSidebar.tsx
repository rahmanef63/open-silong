import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Inbox, Plus, Search, Settings, Sparkles, Trash2, User,
} from "lucide-react";
import { DndContext, DragOverlay } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useStore } from "@/lib/store";
import { Page } from "@/lib/types";
import { cn } from "@/shared/lib/utils";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { InboxBadge } from "@/slices/inbox";
import {
  DENSITY, Section, SidebarAction, SidebarPageLink, DatabaseSidebarRow,
  SortablePageRow, DragGhost, useSidebarDnd, type TreeItem,
} from "@/slices/workspace-sidebar";

interface Props {
  onOpenSearch: () => void;
  onClose?: () => void;
}

export function WorkspaceSidebar({ onOpenSearch, onClose }: Props) {
  const {
    workspace, pages, recents, childrenOf, createPage, preferences,
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
    setOpenIds(new Set(rootPages.filter((page) => childrenOf(page.id).length > 0).map((page) => page.id)));
    setTreeInitialized(true);
  }, [treeInitialized, rootPages, childrenOf]);

  const pageMap = useMemo(() => new Map(pages.map((page) => [page.id, page])), [pages]);

  const treeItems = useMemo(() => {
    const walk = (parentId: string | null, depth: number): TreeItem[] =>
      childrenOf(parentId).flatMap((page) => {
        const item = { page, depth, parentId };
        return openIds.has(page.id) ? [item, ...walk(page.id, depth + 1)] : [item];
      });
    return walk(null, 0);
  }, [childrenOf, openIds]);

  const itemById = useMemo(() => new Map(treeItems.map((item) => [item.page.id, item])), [treeItems]);

  const setPageOpen = (id: string, open: boolean) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (open) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const dnd = useSidebarDnd({ treeItems, pageMap, itemById, setPageOpen });

  const handleNew = async (parentId: string | null = null) => {
    const page = await createPage(parentId);
    if (parentId) setPageOpen(parentId, true);
    navigate(`/p/${page.id}`);
    onClose?.();
  };

  return (
    <aside data-keyboard-scope className="flex h-full w-full flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <button
        onClick={() => { navigate("/profile"); onClose?.(); }}
        className={cn("flex items-center gap-2 hover:bg-sidebar-accent transition text-left", density.header)}
      >
        <div className={cn("flex items-center justify-center rounded-md bg-brand/15", density.avatar)}>
          {workspace.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-foreground">{workspace.name}</div>
          {density.showWorkspaceMeta && (
            <div className="truncate text-xs text-muted-foreground">Personal workspace</div>
          )}
        </div>
      </button>

      <div className="px-2 space-y-0.5">
        <SidebarAction icon={Search} label="Search" shortcut="Ctrl K" onClick={onOpenSearch} density={density} />
        <SidebarAction icon={Sparkles} label="Dashboard" onClick={() => { navigate("/"); onClose?.(); }} active={location.pathname === "/"} density={density} />
        <SidebarAction
          icon={Inbox} label="Inbox" badge={<InboxBadge />}
          onClick={() => { navigate("/inbox"); onClose?.(); }}
          active={location.pathname === "/inbox"} density={density}
        />
        <SidebarAction icon={User} label="Profile" onClick={() => { navigate("/profile"); onClose?.(); }} active={location.pathname === "/profile"} density={density} />
        <SidebarAction icon={Settings} label="Settings" onClick={() => { navigate("/settings"); onClose?.(); }} active={location.pathname === "/settings"} density={density} />
      </div>

      <ScrollArea className={cn("flex-1 px-2", preferences.sidebarDensity === "compact" ? "py-2" : "py-3")}>
        {favorites.length > 0 && (
          <Section title="Favorites" density={density}>
            {favorites.map((page) => (
              <SidebarPageLink key={page.id} page={page} density={density} onClose={onClose} active={location.pathname === `/p/${page.id}`} />
            ))}
          </Section>
        )}

        {recentPages.length > 0 && (
          <Section title="Recent" density={density}>
            {recentPages.map((page) => (
              <SidebarPageLink key={page.id} page={page} density={density} onClose={onClose} active={location.pathname === `/p/${page.id}`} />
            ))}
          </Section>
        )}

        <Section
          title="Workspace"
          density={density}
          action={
            <button
              onClick={() => handleNew(null)}
              className="rounded p-1 hover:bg-sidebar-accent text-muted-foreground hover:text-foreground"
              aria-label="New page"
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
              onClick={() => handleNew(null)}
              className={cn("flex w-full items-center rounded-md px-2 text-muted-foreground hover:bg-sidebar-accent", density.pageLink)}
            >
              <Plus className="h-3.5 w-3.5" /> New page
            </button>
          )}
        </Section>

        {databases.length > 0 && (
          <Section
            title="Databases"
            density={density}
            action={
              <button
                onClick={async () => {
                  const [p, db] = await Promise.all([
                    createPage(null, { title: "Untitled database", icon: "🗂️" }),
                    createDatabase("Untitled database"),
                  ]);
                  const blockId = await addBlock(p.id, 0, "database");
                  updateBlock(p.id, blockId, { databaseId: db.id });
                  navigate(`/p/${p.id}`);
                  onClose?.();
                }}
                className="rounded p-1 hover:bg-sidebar-accent text-muted-foreground hover:text-foreground"
                aria-label="New database"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            }
          >
            {databases.map((db) => (
              <DatabaseSidebarRow key={db.id} db={db} density={density} />
            ))}
          </Section>
        )}

        <Section density={density}>
          <Link
            to="/trash"
            onClick={onClose}
            data-sidebar-nav-item
            className={cn(
              "flex items-center rounded-md px-2 hover:bg-sidebar-accent text-sidebar-foreground",
              density.pageLink,
              location.pathname === "/trash" && "bg-sidebar-accent",
            )}
          >
            <Trash2 className={cn("text-muted-foreground", density.actionIcon)} />
            <span>Trash</span>
          </Link>
        </Section>
      </ScrollArea>

      <div className="border-t border-sidebar-border p-2">
        <button
          onClick={() => handleNew(null)}
          className={cn("flex w-full items-center justify-center gap-2 rounded-md bg-foreground font-medium text-background hover:opacity-90 transition", density.footer)}
        >
          <Plus className="h-4 w-4" /> {preferences.sidebarDensity === "compact" ? "New" : "New page"}
        </button>
      </div>
    </aside>
  );
}
