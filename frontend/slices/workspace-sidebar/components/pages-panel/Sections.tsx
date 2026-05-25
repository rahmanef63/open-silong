import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import type { Database, Page } from "@/shared/types/domain";
import {
  SidebarGroup, SidebarGroupAction, SidebarGroupContent, SidebarGroupLabel,
} from "@/shared/ui/sidebar";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";
import {
  DENSITY, SidebarPageLink, DatabaseSidebarRow,
} from "@/slices/workspace-sidebar";

type Density = (typeof DENSITY)[keyof typeof DENSITY];

export function FavoritesSection({
  pages, density, pathname, basePath, onClose,
}: {
  pages: Page[];
  density: Density;
  pathname: string;
  basePath: (p: string) => string;
  onClose?: () => void;
}) {
  if (pages.length === 0) return null;
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Favorites</SidebarGroupLabel>
      <SidebarGroupContent>
        {pages.map((page) => (
          <SidebarPageLink
            key={page.id}
            page={page}
            density={density}
            onClose={onClose}
            active={pathname === basePath(`/p/${page.id}`)}
          />
        ))}
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function RecentSection({
  pages, density, pathname, basePath, onClose,
}: {
  pages: Page[];
  density: Density;
  pathname: string;
  basePath: (p: string) => string;
  onClose?: () => void;
}) {
  if (pages.length === 0) return null;
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Recent</SidebarGroupLabel>
      <SidebarGroupContent>
        {pages.map((page) => (
          <SidebarPageLink
            key={page.id}
            page={page}
            density={density}
            onClose={onClose}
            active={pathname === basePath(`/p/${page.id}`)}
          />
        ))}
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function DatabasesSection({
  databases, density, onCreate, limit, expanded, onToggleExpanded,
}: {
  databases: Database[];
  density: Density;
  onCreate: () => void;
  /** Max rows shown before the "Show N more" overflow row appears. */
  limit: number;
  expanded: boolean;
  onToggleExpanded: () => void;
}) {
  if (databases.length === 0) return null;
  const visible = expanded ? databases : databases.slice(0, limit);
  const overflowCount = Math.max(0, databases.length - limit);
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Databases</SidebarGroupLabel>
      <SidebarGroupAction
        onClick={onCreate}
        aria-label="New full-page database"
        title="New full-page database — use the slash menu /database for inline"
      >
        <Plus />
      </SidebarGroupAction>
      <SidebarGroupContent>
        {visible.map((db) => (
          <DatabaseSidebarRow key={db.id} db={db} density={density} />
        ))}
        {overflowCount > 0 && (
          <Button
            type="button"
            variant="ghost"
            onClick={onToggleExpanded}
            className={cn(
              "flex w-full h-auto items-center gap-2 rounded-md px-2 text-xs font-normal text-muted-foreground hover:bg-sidebar-accent justify-start [&_svg]:size-3.5",
              density.pageLink,
            )}
            title={expanded ? "Collapse extra databases" : `Show ${overflowCount} more databases`}
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" /> Show less
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" /> Show {overflowCount} more
              </>
            )}
          </Button>
        )}
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
