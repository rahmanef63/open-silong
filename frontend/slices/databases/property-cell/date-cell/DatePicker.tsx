import { useState } from "react";
import type { Property } from "@/shared/types/domain";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";
import { formatDateValue, type DateValue } from "../../lib/dateFormat";
import { DateEditor } from "./Editor";

interface Props {
  value: DateValue | null;
  prop: Property;
  onChange: (v: DateValue | null) => void;
  /** Optional — when present, format/time/notification toggles patch the prop.
   *  When absent (e.g. one-off use), those toggles are hidden by passing a no-op. */
  onPropPatch?: (patch: Partial<Property>) => void;
  className?: string;
  /** Pre-cell sizing classes (height, font-size) from PropertyCell. */
  triggerClass?: string;
  emptyPlaceholder?: string;
}

export function DatePicker({ value, prop, onChange, onPropPatch, triggerClass, emptyPlaceholder = "Empty" }: Props) {
  const [open, setOpen] = useState(false);
  const dv: DateValue = value ?? {};
  const display = formatDateValue(dv, prop);
  const commit = (next: DateValue) => {
    const empty = !next.date && !next.end && !next.time && !next.endTime;
    onChange(empty ? null : next);
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          type="button"
          className={cn(
            "h-auto w-full justify-start rounded px-2 py-1 text-left font-normal outline-none hover:bg-accent/50 focus-visible:ring-1 focus-visible:ring-ring",
            !display && "text-muted-foreground",
            triggerClass,
          )}
        >
          {display || emptyPlaceholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="p-0 w-auto">
        <DateEditor
          value={dv}
          prop={prop}
          onChange={commit}
          onClear={() => { onChange(null); setOpen(false); }}
          onPropPatch={onPropPatch ?? (() => {})}
        />
      </PopoverContent>
    </Popover>
  );
}
