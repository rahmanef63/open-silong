import { ArrowUpDown, Check } from "lucide-react";
import {
  DropdownMenuItem, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger,
} from "@/shared/ui/dropdown-menu";
import type { DatabaseViewConfig } from "@/shared/types/domain";

export function SortSubmenu({
  propId, sorts, onSet, disabled,
}: {
  propId: string;
  sorts: DatabaseViewConfig["sorts"];
  onSet: (next: DatabaseViewConfig["sorts"]) => void;
  disabled?: boolean;
}) {
  const sorted = sorts.find((s) => s.propertyId === propId);
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger disabled={disabled} className={disabled ? "opacity-60" : undefined}>
        <ArrowUpDown className="mr-2 h-3.5 w-3.5" /> Sort
        {sorted && <span className="ml-auto text-[10px] text-brand">{sorted.direction}</span>}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <DropdownMenuItem onClick={() => onSet([
          ...sorts.filter((s) => s.propertyId !== propId),
          { propertyId: propId, direction: "asc" },
        ])}>
          {sorted?.direction === "asc" && <Check className="mr-2 h-3.5 w-3.5" />}
          {sorted?.direction !== "asc" && <span className="mr-2 inline-block w-3.5" />}
          Ascending
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSet([
          ...sorts.filter((s) => s.propertyId !== propId),
          { propertyId: propId, direction: "desc" },
        ])}>
          {sorted?.direction === "desc" && <Check className="mr-2 h-3.5 w-3.5" />}
          {sorted?.direction !== "desc" && <span className="mr-2 inline-block w-3.5" />}
          Descending
        </DropdownMenuItem>
        {sorted && (
          <DropdownMenuItem onClick={() => onSet(sorts.filter((s) => s.propertyId !== propId))}>
            Clear sort
          </DropdownMenuItem>
        )}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
