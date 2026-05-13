import { Check, Repeat } from "lucide-react";
import {
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger,
} from "@/shared/ui/dropdown-menu";
import type { Property, PropertyType } from "@/shared/types/domain";
import { PROPERTY_TYPE_LABELS, PROPERTY_TYPES } from "../../lib/propertyTypeMeta";

export function ChangeTypeSubmenu({
  prop, onChange,
}: { prop: Property; onChange: (t: PropertyType) => void }) {
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger><Repeat className="mr-2 h-3.5 w-3.5" /> Change type</DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="max-h-72 overflow-y-auto">
        <DropdownMenuLabel className="text-xs">Property type</DropdownMenuLabel>
        {PROPERTY_TYPES.map((t) => (
          <DropdownMenuItem key={t} onClick={() => onChange(t)}>
            {prop.type === t && <Check className="mr-2 h-3.5 w-3.5" />}
            {prop.type !== t && <span className="mr-2 inline-block w-3.5" />}
            {PROPERTY_TYPE_LABELS[t]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
