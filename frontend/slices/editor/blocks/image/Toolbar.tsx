import { AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import type { Block } from "@/shared/types/domain";
import { cn } from "@/shared/lib/utils";

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
        <button
          key={value}
          type="button"
          onClick={() => onAlign(value)}
          aria-label={`Align ${value}`}
          className={cn(
            "h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground transition",
            align === value && "bg-accent text-foreground",
          )}
        >
          <Icon className="h-3 w-3" />
        </button>
      ))}
      <span className="mx-0.5 h-3 w-px bg-border" />
      <button
        type="button"
        onClick={onChange}
        className="rounded px-1 text-[11px] text-muted-foreground hover:text-foreground"
      >
        Change
      </button>
    </div>
  );
}
