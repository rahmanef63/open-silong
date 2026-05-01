import { Plus } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { useStore } from "@/shared/lib/store";
import { PROPERTY_TYPE_LABELS } from "@/slices/databases/DatabaseBlock";
import type { PropertyType } from "@/shared/types/domain";

interface Props {
  dbId: string;
}

export function AddColumnHeader({ dbId }: Props) {
  const { addProperty } = useStore();
  return (
    <div className="w-8 shrink-0 flex items-center justify-center border-r border-border last:border-r-0">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Add column"
            title="Add column"
          >
            <Plus className="h-3 w-3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52 max-h-80 overflow-y-auto">
          <DropdownMenuLabel className="text-xs">Add column</DropdownMenuLabel>
          {(Object.keys(PROPERTY_TYPE_LABELS) as PropertyType[]).map((t) => (
            <DropdownMenuItem key={t} onClick={() => addProperty(dbId, t)}>
              {PROPERTY_TYPE_LABELS[t]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
