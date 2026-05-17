import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import type { DensityConfig } from "../lib/density";
import { handleSidebarTraversal } from "../lib/keyboard";

interface Props {
  icon: LucideIcon;
  label: string;
  shortcut?: string;
  badge?: ReactNode;
  onClick?: () => void;
  active?: boolean;
  density: DensityConfig;
}

export function SidebarAction({ icon: Icon, label, shortcut, badge, onClick, active, density }: Props) {
  return (
    <Button
      variant="ghost"
      onClick={onClick}
      data-sidebar-nav-item
      onKeyDown={(e) => handleSidebarTraversal(e, "[data-sidebar-nav-item]")}
      className={cn(
        "flex w-full h-auto items-center rounded-md text-sidebar-foreground hover:bg-sidebar-accent text-sm font-normal justify-start",
        density.action,
        active && "bg-sidebar-accent text-foreground",
      )}
    >
      <Icon className={cn("text-muted-foreground", density.actionIcon)} />
      <span className="flex-1 text-left truncate">{label}</span>
      {density.showActionMeta && shortcut && (
        <span className="text-[10px] text-muted-foreground rounded bg-background px-1.5 py-0.5 border border-border">
          {shortcut}
        </span>
      )}
      {density.showActionMeta && badge}
    </Button>
  );
}
