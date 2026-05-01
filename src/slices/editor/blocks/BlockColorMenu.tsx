import {
  DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator,
} from "@/shared/ui/dropdown-menu";
import { Palette, Check } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { BLOCK_COLORS, BLOCK_COLOR_KEYS, type BlockColorKey } from "../lib/colors";

interface Props {
  value?: string;
  bgValue?: string;
  onPick: (color?: BlockColorKey) => void;
  onPickBg: (bgColor?: BlockColorKey) => void;
}

export function BlockColorMenu({ value, bgValue, onPick, onPickBg }: Props) {
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Palette className="mr-2 h-3.5 w-3.5" /> Color
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="w-48">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Text color</DropdownMenuLabel>
        {BLOCK_COLOR_KEYS.map((k) => (
          <ColorRow
            key={`text-${k}`}
            colorKey={k}
            active={(value ?? "default") === k}
            onClick={() => onPick(k === "default" ? undefined : k)}
            mode="text"
          />
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">Background</DropdownMenuLabel>
        {BLOCK_COLOR_KEYS.map((k) => (
          <ColorRow
            key={`bg-${k}`}
            colorKey={k}
            active={(bgValue ?? "default") === k}
            onClick={() => onPickBg(k === "default" ? undefined : k)}
            mode="bg"
          />
        ))}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}

function ColorRow({
  colorKey, active, onClick, mode,
}: {
  colorKey: BlockColorKey;
  active: boolean;
  onClick: () => void;
  mode: "text" | "bg";
}) {
  const meta = BLOCK_COLORS[colorKey];
  return (
    <DropdownMenuItem onClick={onClick} className="text-sm">
      <span
        aria-hidden
        className={cn(
          "mr-2 inline-flex h-4 w-4 items-center justify-center rounded border border-border",
          mode === "text" ? meta.swatch : meta.bg || "bg-transparent",
        )}
      >
        {mode === "text" && colorKey !== "default" && <span className="text-[10px] font-bold text-background">A</span>}
      </span>
      <span className={cn("flex-1", mode === "text" && colorKey !== "default" && meta.text)}>{meta.label}</span>
      {active && <Check className="h-3.5 w-3.5 text-muted-foreground" />}
    </DropdownMenuItem>
  );
}
