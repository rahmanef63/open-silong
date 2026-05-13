import { Check, Sigma } from "lucide-react";
import {
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger,
} from "@/shared/ui/dropdown-menu";
import type { CalcKind } from "@/shared/types/domain";
import { calcLabel } from "../../lib/calcAggregate";

export function CalcSubmenu({
  currentCalc, calcs, onSet,
}: {
  currentCalc: CalcKind;
  calcs: CalcKind[];
  onSet: (c: CalcKind) => void;
}) {
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Sigma className="mr-2 h-3.5 w-3.5" /> Calculate
        {currentCalc !== "none" && (
          <span className="ml-auto truncate text-[10px] text-brand">{calcLabel(currentCalc)}</span>
        )}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="max-h-72 overflow-y-auto">
        <DropdownMenuItem onClick={() => onSet("none")}>
          {currentCalc === "none" && <Check className="mr-2 h-3.5 w-3.5" />}
          {currentCalc !== "none" && <span className="mr-2 inline-block w-3.5" />}
          None
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {calcs.map((c) => (
          <DropdownMenuItem key={c} onClick={() => onSet(c)}>
            {currentCalc === c && <Check className="mr-2 h-3.5 w-3.5" />}
            {currentCalc !== c && <span className="mr-2 inline-block w-3.5" />}
            {calcLabel(c)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
