import { cn } from "@/shared/lib/utils";
import { DynamicIcon } from "@/shared/components/icon-picker";
import { DENSITY, type DensityConfig } from "../lib/density";
import type { TreeItem } from "../lib/keyboard";

interface Props {
  item: TreeItem;
  density: DensityConfig;
}

export function DragGhost({ item, density }: Props) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-md bg-sidebar-accent/95 shadow-pop ring-1 ring-border px-2 backdrop-blur",
        density.pageLink,
      )}
      style={{ paddingLeft: `${item.depth * density.indent + 8}px` }}
    >
      <DynamicIcon
        value={item.page.icon}
        className={cn("shrink-0", density === DENSITY.compact ? "text-sm" : "text-base")}
      />
      <span className="truncate text-sm">{item.page.title || "Untitled"}</span>
    </div>
  );
}
