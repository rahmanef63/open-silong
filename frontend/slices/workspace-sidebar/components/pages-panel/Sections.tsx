import { Plus } from "lucide-react";
import type { Database, Page } from "@/shared/types/domain";
import {
  SidebarGroup, SidebarGroupAction, SidebarGroupContent, SidebarGroupLabel,
} from "@/shared/ui/sidebar";
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
  databases, density, onCreate,
}: {
  databases: Database[];
  density: Density;
  onCreate: () => void;
}) {
  if (databases.length === 0) return null;
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Databases</SidebarGroupLabel>
      <SidebarGroupAction
        onClick={onCreate}
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
  );
}
