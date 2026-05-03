import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Inbox, Plus, Search, Settings, Sparkles, Trash2, User, ShieldAlert, FileBox, Bot,
} from "lucide-react";
import { useAdminRole } from "@/slices/admin-panel";
import { TemplateGalleryDialog } from "@/slices/templates";
import { AIAgentConsole } from "@/slices/ai-agent";
import { DndContext, DragOverlay } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useStore } from "@/shared/lib/store";
import { Page } from "@/shared/types/domain";
import { cn } from "@/shared/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from "@/shared/ui/sidebar";
import { InboxBadge } from "@/slices/inbox";
import {
  DENSITY, SidebarPageLink, DatabaseSidebarRow,
  SortablePageRow, DragGhost, useSidebarDnd, type TreeItem,
} from "@/slices/workspace-sidebar";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { NavUser } from "./NavUser";

interface Props {
  onOpenSearch: () => void;
  onClose?: () => void;
}

export function WorkspaceSidebar({ onOpenSearch, onClose }: Props) {
  const {
    pages, recents, childrenOf, createPage, preferences,
    databases, createDatabase, addBlock, updateBlock,
  } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const density = DENSITY[preferences.sidebarDensity];
  const { setOpenMobile, isMobile } = useSidebar();
  const { isAdmin } = useAdminRole();
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
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

  function go(path: string) {
    navigate(path);
    if (isMobile) setOpenMobile(false);
    onClose?.();
  }

  const handleNew = async (parentId: string | null = null) => {
    const page = await createPage(parentId);
    if (parentId) setPageOpen(parentId, true);
    go(`/p/${page.id}`);
  };

  const navItems: Array<{ icon: typeof Search; label: string; onClick: () => void; active: boolean; shortcut?: string; badge?: React.ReactNode }> = [
    { icon: Search, label: "Search", onClick: onOpenSearch, active: false, shortcut: "⌘K" },
    { icon: Sparkles, label: "Dashboard", onClick: () => go("/"), active: location.pathname === "/" },
    { icon: Bot, label: "AI", onClick: () => setAiOpen(true), active: false },
    { icon: Inbox, label: "Inbox", onClick: () => go("/inbox"), active: location.pathname === "/inbox", badge: <InboxBadge /> },
    { icon: FileBox, label: "Templates", onClick: () => setTemplatesOpen(true), active: false },
    { icon: User, label: "Profile", onClick: () => go("/profile"), active: location.pathname === "/profile" },
    { icon: Settings, label: "Settings", onClick: () => go("/settings"), active: location.pathname === "/settings" },
  ];
  if (isAdmin) {
    navItems.push({
      icon: ShieldAlert,
      label: "Admin",
      onClick: () => { window.location.href = "/admin"; },
      active: false,
    });
  }

  return (
    <Sidebar collapsible="icon" data-keyboard-scope>
      <SidebarHeader>
        <WorkspaceSwitcher />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    onClick={item.onClick}
                    isActive={item.active}
                    tooltip={item.label}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                    {item.badge ? <span className="ml-auto">{item.badge}</span> : null}
                    {item.shortcut ? (
                      <span className="ml-auto text-[10px] tracking-wider text-muted-foreground">
                        {item.shortcut}
                      </span>
                    ) : null}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

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
                  active={location.pathname === `/p/${page.id}`}
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
                  active={location.pathname === `/p/${page.id}`}
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
            onClick={() => handleNew(null)}
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

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname === "/trash"}
                  tooltip="Trash"
                >
                  <Link
                    to="/trash"
                    onClick={() => {
                      if (isMobile) setOpenMobile(false);
                      onClose?.();
                    }}
                    data-sidebar-nav-item
                  >
                    <Trash2 />
                    <span>Trash</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => handleNew(null)}
              tooltip="New page"
              className="bg-foreground text-background hover:bg-foreground hover:opacity-90 hover:text-background data-[active=true]:bg-foreground data-[active=true]:text-background"
            >
              <Plus />
              <span>New page</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
      <TemplateGalleryDialog
        open={templatesOpen}
        onOpenChange={setTemplatesOpen}
        onInstantiated={(rootPageId) => go(`/p/${rootPageId}`)}
      />
      <AIAgentConsole open={aiOpen} onOpenChange={setAiOpen} />
    </Sidebar>
  );
}
