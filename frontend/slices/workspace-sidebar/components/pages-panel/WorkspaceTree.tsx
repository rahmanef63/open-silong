import { Plus } from "lucide-react";
import { DndContext, DragOverlay } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import {
  SidebarGroup, SidebarGroupAction, SidebarGroupContent, SidebarGroupLabel,
} from "@/shared/ui/sidebar";
import { cn } from "@/shared/lib/utils";
import {
  DENSITY, SortablePageRow, DragGhost, type TreeItem, useSidebarDnd,
} from "@/slices/workspace-sidebar";
import type { Page } from "@/shared/types/domain";

type Density = (typeof DENSITY)[keyof typeof DENSITY];
type Dnd = ReturnType<typeof useSidebarDnd>;

interface Props {
  treeItems: TreeItem[];
  density: Density;
  openIds: Set<string>;
  setPageOpen: (id: string, open: boolean) => void;
  childrenCounts: Map<string | null, number>;
  rootPages: Page[];
  dnd: Dnd;
  onClose?: () => void;
  onRequestDelete: (p: Page) => void;
  onNewPage: () => void;
}

export function WorkspaceTree({
  treeItems, density, openIds, setPageOpen, childrenCounts, rootPages, dnd,
  onClose, onRequestDelete, onNewPage,
}: Props) {
  return (
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
        onClick={onNewPage}
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
                  onRequestDelete={onRequestDelete}
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
            onClick={onNewPage}
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
  );
}
