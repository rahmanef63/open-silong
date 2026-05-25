import { Smile, Shapes, Trash2, Shuffle } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { TabsList, TabsTrigger } from "@/shared/ui/tabs";

export function PickerToolbar({
  onRandom, onClear,
}: {
  onRandom: () => void;
  onClear?: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <TabsList className="h-8">
        <TabsTrigger value="emoji" className="h-7 text-xs gap-1">
          <Smile className="h-3.5 w-3.5" /> Emoji
        </TabsTrigger>
        <TabsTrigger value="icon" className="h-7 text-xs gap-1">
          <Shapes className="h-3.5 w-3.5" /> Icon
        </TabsTrigger>
      </TabsList>
      <div className="ml-auto flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={onRandom}
          title="Random"
        >
          <Shuffle className="h-3.5 w-3.5" />
        </Button>
        {onClear && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground"
            onClick={onClear}
            title="Remove icon"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

/** Variant pills shown under the top tabs. Two values per tab:
 *  - emoji tab → "native" | "twemoji"
 *  - icon tab  → "lucide" | "phosphor"  */
export function VariantPills<T extends string>({
  value, onChange, options,
}: {
  value: T;
  onChange: (next: T) => void;
  options: ReadonlyArray<{ value: T; label: string; hint?: string }>;
}) {
  return (
    <div className="flex h-7 w-full items-center gap-0.5 rounded-md border border-border bg-muted/30 p-0.5">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            title={opt.hint}
            className={
              "flex h-6 flex-1 items-center justify-center rounded-[5px] px-2 text-[11px] font-medium transition " +
              (active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground")
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
