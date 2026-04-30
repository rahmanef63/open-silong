import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ChevronRight, Copy, GripVertical, Inbox, MoreHorizontal, Pencil, Plus, Search,
  Settings, Sparkles, Star, Table2, Trash2, User,
  type LucideIcon,
} from "lucide-react";
import {
  closestCenter, DndContext, DragOverlay, KeyboardSensor, PointerSensor,
  type DragEndEvent, type DragMoveEvent, type DragStartEvent,
  useSensor, useSensors,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis, restrictToFirstScrollableAncestor } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { Page } from "@/lib/types";
import { cn } from "@/shared/lib/utils";
import { focusSiblingBySelector, isTextInputTarget } from "@/shared/lib/keyboard";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { InboxBadge } from "@/slices/inbox";

interface Props {
  onOpenSearch: () => void;
  onClose?: () => void;
}

type DensityConfig = {
  header: string;
  avatar: string;
  action: string;
  actionIcon: string;
  pageLink: string;
  toggle: string;
  section: string;
  sectionTitle: string;
  footer: string;
  indent: number;
  showWorkspaceMeta: boolean;
  showActionMeta: boolean;
};

const DENSITY: Record<"comfortable" | "compact", DensityConfig> = {
  comfortable: {
    header: "px-3 py-3",
    avatar: "h-8 w-8 text-base",
    action: "min-h-8 gap-2 px-2 py-1.5 text-sm",
    actionIcon: "h-4 w-4",
    pageLink: "min-h-8 gap-1.5 py-1.5 text-sm",
    toggle: "h-6 w-6",
    section: "mb-4",
    sectionTitle: "text-[11px]",
    footer: "px-3 py-2 text-sm",
    indent: 12,
    showWorkspaceMeta: true,
    showActionMeta: true,
  },
  compact: {
    header: "px-2 py-2",
    avatar: "h-7 w-7 text-sm",
    action: "min-h-7 gap-1.5 px-2 py-1 text-xs",
    actionIcon: "h-3.5 w-3.5",
    pageLink: "min-h-7 gap-1 py-1 text-xs",
    toggle: "h-5 w-5",
    section: "mb-2",
    sectionTitle: "text-[10px]",
    footer: "px-2 py-1.5 text-xs",
    indent: 10,
    showWorkspaceMeta: false,
    showActionMeta: false,
  },
};

type TreeItem = { page: Page; depth: number; parentId: string | null };

export function WorkspaceSidebar({ onOpenSearch, onClose }: Props) {
  const {
    workspace, pages, recents, childrenOf, createPage, preferences, reorderPages,
    databases, createDatabase, addBlock, updateBlock, movePage,
  } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const density = DENSITY[preferences.sidebarDensity];
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [treeInitialized, setTreeInitialized] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [nestIntent, setNestIntent] = useState(false);
  const [externalOverId, setExternalOverId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const favorites = pages.filter(p => p.favorite && !p.trashed && !p.rowOfDatabaseId);
  const recentPages = recents.map(id => pages.find(p => p.id === id)).filter((p): p is Page => !!p && !p.trashed && !p.rowOfDatabaseId);
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

  const isDescendantOf = (possibleChildId: string, parentId: string) => {
    let current = pageMap.get(possibleChildId);
    while (current?.parentId) {
      if (current.parentId === parentId) return true;
      current = pageMap.get(current.parentId);
    }
    return false;
  };

  const handleNew = async (parentId: string | null = null) => {
    const page = await createPage(parentId);
    if (parentId) setPageOpen(parentId, true);
    navigate(`/p/${page.id}`);
    onClose?.();
  };

  const resetDrag = () => {
    setActiveId(null);
    setOverId(null);
    setNestIntent(false);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragMove = (event: DragMoveEvent) => {
    setOverId(event.over ? String(event.over.id) : null);
    setNestIntent(event.delta.x > 28);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over, delta } = event;
    resetDrag();
    if (!over || active.id === over.id) return;
    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);
    const overItem = itemById.get(overIdStr);
    if (!overItem || isDescendantOf(overIdStr, activeIdStr)) return;

    if (delta.x > 28) {
      const childIds = childrenOf(overIdStr).map((page) => page.id).filter((id) => id !== activeIdStr);
      reorderPages(overIdStr, [...childIds, activeIdStr]);
      setPageOpen(overIdStr, true);
      return;
    }

    const targetParentId = overItem.parentId;
    const siblingIds = childrenOf(targetParentId).map((page) => page.id).filter((id) => id !== activeIdStr);
    const overIndex = siblingIds.indexOf(overIdStr);
    const next = [...siblingIds];
    next.splice(overIndex === -1 ? next.length : overIndex, 0, activeIdStr);
    reorderPages(targetParentId, next);
    if (targetParentId) setPageOpen(targetParentId, true);
  };

  const handleNativeDropOnPage = (targetPageId: string | null, e: React.DragEvent) => {
    setExternalOverId(null);
    const droppedId = e.dataTransfer.getData("application/x-page-id");
    if (!droppedId) return;
    if (droppedId === targetPageId) return;
    if (targetPageId && isDescendantOf(targetPageId, droppedId)) {
      toast.error("Can't move a page into its own descendant");
      return;
    }
    e.preventDefault();
    movePage(droppedId, targetPageId);
    if (targetPageId) setPageOpen(targetPageId, true);
    toast.success("Page moved");
  };

  const activeDraggedItem = activeId ? itemById.get(activeId) : null;

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
          icon={Inbox}
          label="Inbox"
          onClick={() => { navigate("/inbox"); onClose?.(); }}
          active={location.pathname === "/inbox"}
          badge={<InboxBadge />}
          density={density}
        />
        <SidebarAction icon={User} label="Profile" onClick={() => { navigate("/profile"); onClose?.(); }} active={location.pathname === "/profile"} density={density} />
        <SidebarAction icon={Settings} label="Settings" onClick={() => { navigate("/settings"); onClose?.(); }} active={location.pathname === "/settings"} density={density} />
      </div>

      <ScrollArea className={cn("flex-1 px-2", preferences.sidebarDensity === "compact" ? "py-2" : "py-3")}>
        {favorites.length > 0 && (
          <Section title="Favorites" density={density}>
            {favorites.map(page => (
              <SidebarPageLink key={page.id} page={page} density={density} onClose={onClose} active={location.pathname === `/p/${page.id}`} />
            ))}
          </Section>
        )}

        {recentPages.length > 0 && (
          <Section title="Recent" density={density}>
            {recentPages.map(page => (
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
          onDrop={(e) => handleNativeDropOnPage(null, e)}
        >
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis, restrictToFirstScrollableAncestor]}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
            onDragCancel={resetDrag}
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
              <SortableContext items={treeItems.map((item) => item.page.id)} strategy={verticalListSortingStrategy}>
                {treeItems.map((item) => (
                  <SortablePageRow
                    key={item.page.id}
                    item={item}
                    density={density}
                    isOpen={openIds.has(item.page.id)}
                    setOpen={(open) => setPageOpen(item.page.id, open)}
                    onClose={onClose}
                    isOverSibling={overId === item.page.id && !nestIntent && activeId !== null}
                    isOverNesting={overId === item.page.id && nestIntent && activeId !== null}
                    isExternalOver={externalOverId === item.page.id}
                    onExternalEnter={() => setExternalOverId(item.page.id)}
                    onExternalLeave={() => setExternalOverId((cur) => (cur === item.page.id ? null : cur))}
                    onExternalDrop={(e) => handleNativeDropOnPage(item.page.id, e)}
                  />
                ))}
              </SortableContext>
            </div>
            <DragOverlay dropAnimation={{ duration: 150, easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)" }}>
              {activeDraggedItem ? (
                <div
                  className={cn(
                    "flex items-center gap-1.5 rounded-md bg-sidebar-accent/95 shadow-pop ring-1 ring-border px-2 backdrop-blur",
                    density.pageLink,
                  )}
                  style={{ paddingLeft: `${activeDraggedItem.depth * density.indent + 8}px` }}
                >
                  <span className={cn("leading-none", density === DENSITY.compact ? "text-sm" : "text-base")}>
                    {activeDraggedItem.page.icon}
                  </span>
                  <span className="truncate text-sm">{activeDraggedItem.page.title || "Untitled"}</span>
                </div>
              ) : null}
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
            {databases.map(db => (
              <DatabaseSidebarRow key={db.id} db={db} density={density} />
            ))}
          </Section>
        )}

        <Section title="" density={density}>
          <Link
            to="/trash"
            onClick={onClose}
            data-sidebar-nav-item
            onKeyDown={(e) => handleSidebarTraversal(e, "[data-sidebar-nav-item]")}
            className={cn(
              "flex items-center rounded-md px-2 hover:bg-sidebar-accent text-sidebar-foreground",
              density.pageLink,
              location.pathname === "/trash" && "bg-sidebar-accent"
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

function DatabaseSidebarRow({ db, density }: { db: import("@/lib/types").Database; density: DensityConfig }) {
  const { trashDatabase, pages } = useStore();
  const navigate = useNavigate();
  const host = useMemo(
    () =>
      pages.find(
        (p) =>
          !p.trashed &&
          p.blocks.some((b) => b.type === "database" && b.databaseId === db.id),
      ),
    [pages, db.id],
  );
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-md px-2 text-sidebar-foreground hover:bg-sidebar-accent group/db",
        density.pageLink,
      )}
    >
      <button
        onClick={() => host && navigate(`/p/${host.id}`)}
        className="flex flex-1 min-w-0 items-center gap-1.5 text-left"
        disabled={!host}
        title={host ? `Open ${host.title || "page"}` : "No host page"}
      >
        <Table2 className={cn("shrink-0 text-muted-foreground", density.actionIcon)} />
        <span className="flex-1 truncate">{db.name}</span>
        <span className="text-[10px] text-muted-foreground shrink-0">{db.rowIds.length}</span>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="opacity-0 group-hover/db:opacity-100 rounded p-0.5 hover:bg-background text-muted-foreground"
            aria-label="Database actions"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-3 w-3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {host && (
            <DropdownMenuItem onClick={() => navigate(`/p/${host.id}`)}>
              Open host page
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive" onClick={() => trashDatabase(db.id)}>
            <Trash2 className="mr-2 h-3.5 w-3.5" /> Move to trash
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function SidebarAction({
  icon: Icon, label, shortcut, badge, onClick, active, density,
}: {
  icon: LucideIcon;
  label: string;
  shortcut?: string;
  badge?: ReactNode;
  onClick?: () => void;
  active?: boolean;
  density: DensityConfig;
}) {
  return (
    <button
      onClick={onClick}
      data-sidebar-nav-item
      onKeyDown={(e) => handleSidebarTraversal(e, "[data-sidebar-nav-item]")}
      className={cn(
        "flex w-full items-center rounded-md text-sidebar-foreground hover:bg-sidebar-accent transition",
        density.action,
        active && "bg-sidebar-accent text-foreground"
      )}
    >
      <Icon className={cn("text-muted-foreground", density.actionIcon)} />
      <span className="flex-1 text-left truncate">{label}</span>
      {density.showActionMeta && shortcut && <span className="text-[10px] text-muted-foreground rounded bg-background px-1.5 py-0.5 border border-border">{shortcut}</span>}
      {density.showActionMeta && badge}
    </button>
  );
}

function Section({
  title, action, children, density, onDragOver, onDrop,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  density: DensityConfig;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}) {
  return (
    <div className={density.section} onDragOver={onDragOver} onDrop={onDrop}>
      {title && (
        <div className="flex items-center justify-between px-2 mb-1">
          <span className={cn("uppercase tracking-wider font-semibold text-muted-foreground", density.sectionTitle)}>{title}</span>
          {action}
        </div>
      )}
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function SidebarPageLink({
  page, active, onClose, density,
}: {
  page: Page;
  active: boolean;
  onClose?: () => void;
  density: DensityConfig;
}) {
  return (
    <Link
      to={`/p/${page.id}`}
      onClick={onClose}
      data-sidebar-nav-item
      onKeyDown={(e) => handleSidebarTraversal(e, "[data-sidebar-nav-item]")}
      className={cn(
        "flex items-center rounded-md px-2 hover:bg-sidebar-accent text-sidebar-foreground",
        density.pageLink,
        active && "bg-sidebar-accent"
      )}
    >
      <span className={cn("leading-none", density === DENSITY.compact ? "text-sm" : "text-base")}>{page.icon}</span>
      <span className="truncate">{page.title || "Untitled"}</span>
    </Link>
  );
}

function SortablePageRow({
  item, density, isOpen, setOpen, onClose,
  isOverSibling, isOverNesting, isExternalOver,
  onExternalEnter, onExternalLeave, onExternalDrop,
}: {
  item: TreeItem;
  density: DensityConfig;
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  onClose?: () => void;
  isOverSibling: boolean;
  isOverNesting: boolean;
  isExternalOver: boolean;
  onExternalEnter: () => void;
  onExternalLeave: () => void;
  onExternalDrop: (e: React.DragEvent) => void;
}) {
  const { childrenOf, createPage, duplicatePage, deletePage, toggleFavorite, updatePage } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(item.page.title);
  const kids = childrenOf(item.page.id);
  const active = location.pathname === `/p/${item.page.id}`;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.page.id });

  const commitName = () => {
    updatePage(item.page.id, { title: name });
    setRenaming(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("relative", isDragging && "opacity-30")}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("application/x-page-id")) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          onExternalEnter();
        }
      }}
      onDragLeave={onExternalLeave}
      onDrop={onExternalDrop}
    >
      {isOverSibling && (
        <div
          aria-hidden
          className="pointer-events-none absolute -top-px left-1.5 right-1.5 h-0.5 rounded-full bg-brand z-10"
        />
      )}
      <div
        className={cn(
          "group flex items-center gap-1 rounded-md pr-1 transition-colors duration-150",
          "hover:bg-sidebar-accent/80",
          active && "bg-sidebar-accent",
          (isOverNesting || isExternalOver) && "bg-brand/15 ring-1 ring-brand ring-inset",
        )}
        style={{ paddingLeft: `${item.depth * density.indent}px` }}
      >
        <button
          onClick={() => setOpen(!isOpen)}
          className={cn("flex items-center justify-center rounded hover:bg-background/60 text-muted-foreground", density.toggle)}
          aria-label="Toggle"
        >
          <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-90", kids.length === 0 && "opacity-30")} />
        </button>
        <Link
          to={`/p/${item.page.id}`}
          onClick={onClose}
          data-sidebar-nav-item
          data-sidebar-tree-item
          data-sidebar-page-id={item.page.id}
          data-sidebar-parent-id={item.parentId ?? ""}
          onKeyDown={(e) => handleTreeKey(e, item, kids, isOpen, setOpen)}
          className={cn("flex min-w-0 flex-1 items-center", density.pageLink)}
        >
          <span className={cn("leading-none", density === DENSITY.compact ? "text-sm" : "text-base")}>{item.page.icon}</span>
          {renaming ? (
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              onBlur={commitName}
              onKeyDown={e => {
                if (e.key === "Enter") commitName();
                if (e.key === "Escape") { setName(item.page.title); setRenaming(false); }
              }}
              className="min-w-0 flex-1 rounded bg-background px-1 py-0.5 text-sm outline-none ring-1 ring-ring"
              onClick={e => e.preventDefault()}
            />
          ) : (
            <span className="truncate">{item.page.title || "Untitled"}</span>
          )}
        </Link>
        <div className="flex items-center opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition">
          <button
            {...attributes}
            {...listeners}
            className={cn("flex items-center justify-center rounded hover:bg-background/60 text-muted-foreground cursor-grab active:cursor-grabbing", density.toggle)}
            aria-label="Drag page"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={cn("flex items-center justify-center rounded hover:bg-background/60 text-muted-foreground", density.toggle)} aria-label="More">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="right">
              <DropdownMenuItem onClick={() => toggleFavorite(item.page.id)}>
                <Star className="mr-2 h-4 w-4" /> {item.page.favorite ? "Remove from favorites" : "Add to favorites"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setRenaming(true)}>
                <Pencil className="mr-2 h-4 w-4" /> Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={async () => {
                  const copy = await duplicatePage(item.page.id);
                  if (copy) navigate(`/p/${copy.id}`);
                }}
              >
                <Copy className="mr-2 h-4 w-4" /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => { deletePage(item.page.id); if (active) navigate("/"); }}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Move to trash
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            onClick={async () => {
              const child = await createPage(item.page.id);
              setOpen(true);
              navigate(`/p/${child.id}`);
              onClose?.();
            }}
            className={cn("flex items-center justify-center rounded hover:bg-background/60 text-muted-foreground", density.toggle)}
            aria-label="Add subpage"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function handleSidebarTraversal(e: React.KeyboardEvent<HTMLElement>, selector: string) {
  if (isTextInputTarget(e.target)) return;
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    focusSiblingBySelector(e.currentTarget, selector, e.key === "ArrowDown" ? 1 : -1);
  }
}

function handleTreeKey(
  e: React.KeyboardEvent<HTMLElement>,
  item: TreeItem,
  kids: Page[],
  isOpen: boolean,
  setOpen: (open: boolean) => void,
) {
  if (isTextInputTarget(e.target)) return;

  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    focusSiblingBySelector(e.currentTarget, "[data-sidebar-tree-item]", e.key === "ArrowDown" ? 1 : -1);
    return;
  }

  if (e.key === "ArrowRight" && kids.length > 0) {
    e.preventDefault();
    if (!isOpen) {
      setOpen(true);
      return;
    }
    window.setTimeout(() => {
      document.querySelector<HTMLElement>(`[data-sidebar-parent-id="${item.page.id}"]`)?.focus();
    }, 0);
    return;
  }

  if (e.key === "ArrowLeft") {
    e.preventDefault();
    if (isOpen && kids.length > 0) {
      setOpen(false);
      return;
    }
    if (item.parentId) {
      document.querySelector<HTMLElement>(`[data-sidebar-page-id="${item.parentId}"]`)?.focus();
    }
  }
}
