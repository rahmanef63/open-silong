import { Plus } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useStore } from "@/lib/store";
import { PROPERTY_TYPE_LABELS } from "@/components/database/DatabaseBlock";
import type { PropertyType } from "@/lib/types";

interface Props {
  dbId: string;
}

export function AddColumnHeader({ dbId }: Props) {
  const { addProperty } = useStore();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-1 px-3 py-1.5 text-[11px] uppercase tracking-wider text-muted-foreground hover:bg-accent/50 transition shrink-0 min-w-[120px]"
          aria-label="Add column"
        >
          <Plus className="h-3 w-3" />
          <span className="font-semibold">Add column</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52 max-h-80 overflow-y-auto">
        <DropdownMenuLabel className="text-xs">Property type</DropdownMenuLabel>
        {(Object.keys(PROPERTY_TYPE_LABELS) as PropertyType[]).map((t) => (
          <DropdownMenuItem key={t} onClick={() => addProperty(dbId, t)}>
            {PROPERTY_TYPE_LABELS[t]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
