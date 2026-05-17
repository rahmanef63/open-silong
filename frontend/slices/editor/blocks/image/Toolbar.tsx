import { AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import type { Block } from "@/shared/types/domain";
import { cn } from "@/shared/lib/utils";
import { Separator } from "@/shared/ui/separator";
import { Button } from "@/shared/ui/button";

const ALIGN_OPTIONS: { value: NonNullable<Block["align"]>; Icon: typeof AlignLeft }[] = [
  { value: "left", Icon: AlignLeft },
  { value: "center", Icon: AlignCenter },
  { value: "right", Icon: AlignRight },
];

export function ImageToolbar({
  align, onAlign, onChange,
}: {
  align: NonNullable<Block["align"]>;
  onAlign: (v: NonNullable<Block["align"]>) => void;
  onChange: () => void;
}) {
  return (
    <div className="absolute top-1 right-1 flex items-center gap-1 rounded bg-background/85 border border-border px-1 py-0.5 opacity-0 group-hover/img:opacity-100 transition">
      {ALIGN_OPTIONS.map(({ value, Icon }) => (
        <Button
          variant="ghost"
          key={value}
          type="button"
          onClick={() => onAlign(value)}
          aria-label={`Align ${value}`}
          className={cn(
            "h-5 w-5 rounded p-0 text-muted-foreground transition hover:text-foreground [&_svg]:size-3",
            align === value && "bg-accent text-foreground",
          )}
        >
          <Icon className="h-3 w-3" />
        </Button>
      ))}
      <Separator orientation="vertical" className="mx-0.5 h-3" />
      <Button
        variant="ghost"
        type="button"
        onClick={onChange}
        className="h-auto rounded px-1 text-[11px] font-normal text-muted-foreground hover:bg-transparent hover:text-foreground"
      >
        Change
      </Button>
    </div>
  );
}
