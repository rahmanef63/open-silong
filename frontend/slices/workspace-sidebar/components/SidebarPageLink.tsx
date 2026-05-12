import { memo } from "react";
import { Link } from "@/shared/lib/router";
import type { Page } from "@/shared/types/domain";
import { cn } from "@/shared/lib/utils";
import { DynamicIcon } from "@/shared/components/icon-picker";
import { DENSITY, type DensityConfig } from "../lib/density";
import { handleSidebarTraversal } from "../lib/keyboard";

interface Props {
  page: Page;
  active?: boolean;
  onClose?: () => void;
  density: DensityConfig;
}

function SidebarPageLinkImpl({ page, active = false, onClose, density }: Props) {
  return (
    <Link
      to={`/p/${page.id}`}
      onClick={onClose}
      data-sidebar-nav-item
      onKeyDown={(e) => handleSidebarTraversal(e, "[data-sidebar-nav-item]")}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-2 hover:bg-sidebar-accent text-sidebar-foreground",
        density.pageLink,
        active && "bg-sidebar-accent",
      )}
    >
      <DynamicIcon
        value={page.icon}
        className={cn("shrink-0", density === DENSITY.compact ? "text-sm" : "text-base")}
      />
      <span className="truncate">{page.title || "Untitled"}</span>
    </Link>
  );
}

export const SidebarPageLink = memo(SidebarPageLinkImpl, (prev, next) =>
  prev.page === next.page &&
  prev.active === next.active &&
  prev.density === next.density,
);
