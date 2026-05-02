import { Link } from "react-router-dom";
import type { Page } from "@/shared/types/domain";
import { cn } from "@/shared/lib/utils";
import { DENSITY, type DensityConfig } from "../lib/density";
import { handleSidebarTraversal } from "../lib/keyboard";

interface Props {
  page: Page;
  active?: boolean;
  onClose?: () => void;
  density: DensityConfig;
}

export function SidebarPageLink({ page, active = false, onClose, density }: Props) {
  return (
    <Link
      to={`/p/${page.id}`}
      onClick={onClose}
      data-sidebar-nav-item
      onKeyDown={(e) => handleSidebarTraversal(e, "[data-sidebar-nav-item]")}
      className={cn(
        "flex items-center rounded-md px-2 hover:bg-sidebar-accent text-sidebar-foreground",
        density.pageLink,
        active && "bg-sidebar-accent",
      )}
    >
      <span className={cn("leading-none", density === DENSITY.compact ? "text-sm" : "text-base")}>{page.icon}</span>
      <span className="truncate">{page.title || "Untitled"}</span>
    </Link>
  );
}
