import { Plus } from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import type { PropertyType } from "@/shared/types/domain";
import { PROPERTY_TYPE_ICONS, PROPERTY_TYPE_LABELS } from "@/slices/databases";

export function AddPropertyMenu({ onAdd }: { onAdd: (type: PropertyType) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-border/40">
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-3 py-2 w-full transition-colors">
            <Plus className="h-3.5 w-3.5" />
            Add property
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          {(Object.keys(PROPERTY_TYPE_LABELS) as PropertyType[]).map((type) => {
            const Icon = PROPERTY_TYPE_ICONS[type];
            return (
              <DropdownMenuItem
                key={type}
                onClick={() => { onAdd(type); setOpen(false); }}
              >
                <Icon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                {PROPERTY_TYPE_LABELS[type]}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
