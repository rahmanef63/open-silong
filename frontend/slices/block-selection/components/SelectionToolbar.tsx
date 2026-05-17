import { Copy, Palette, Trash2, Type, X } from "lucide-react";
import { useStore } from "@/shared/lib/store";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { cn } from "@/shared/lib/utils";
import { Separator } from "@/shared/ui/separator";
import { Button } from "@/shared/ui/button";
import type { BlockType } from "@/shared/types/domain";
import { BLOCK_SPECS, BLOCK_COLORS, BLOCK_COLOR_KEYS, type BlockColorKey } from "@/slices/editor";
import { useBlockSelection } from "./BlockSelectionProvider";

interface Props {
  pageId: string;
}

export function SelectionToolbar({ pageId }: Props) {
  const { state, count, clear } = useBlockSelection();
  const { deleteBlock, duplicateBlock, updateBlock, setBlockType } = useStore();

  if (count === 0) return null;

  const ids = [...state.ids];

  const onDelete = () => {
    ids.forEach((id) => deleteBlock(pageId, id));
    clear();
  };
  const onDuplicate = () => {
    ids.forEach((id) => duplicateBlock(pageId, id));
    clear();
  };
  const onColor = (k: BlockColorKey) => {
    const v = k === "default" ? undefined : k;
    ids.forEach((id) => updateBlock(pageId, id, { color: v }));
  };
  const onBg = (k: BlockColorKey) => {
    const v = k === "default" ? undefined : k;
    ids.forEach((id) => updateBlock(pageId, id, { bgColor: v }));
  };
  const onConvert = (type: BlockType) => {
    ids.forEach((id) => setBlockType(pageId, id, type));
    clear();
  };

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div
      data-block-selection-toolbar
      onMouseDown={stop}
      onClick={stop}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-1.5 shadow-lg"
    >
      <span className="px-2 text-xs text-muted-foreground tabular-nums">
        {count} selected
      </span>
      <Separator orientation="vertical" className="h-5" />

      <ToolButton onClick={onDuplicate} title="Duplicate">
        <Copy className="h-3.5 w-3.5" /> Duplicate
      </ToolButton>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-auto gap-1 rounded px-2 py-1 text-xs font-normal [&_svg]:size-3.5">
            <Type className="h-3.5 w-3.5" /> Turn into
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" side="top" className="w-52 max-h-72 overflow-y-auto">
          <DropdownMenuLabel className="text-xs text-muted-foreground">Turn selection into</DropdownMenuLabel>
          {BLOCK_SPECS
            .filter((s) => s.type !== "page" && s.type !== "database")
            .map((s) => (
              <DropdownMenuItem key={s.type} onClick={() => onConvert(s.type)}>
                <s.icon className="mr-2 h-3.5 w-3.5" /> {s.label}
              </DropdownMenuItem>
            ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-auto gap-1 rounded px-2 py-1 text-xs font-normal [&_svg]:size-3.5">
            <Palette className="h-3.5 w-3.5" /> Color
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" side="top" className="w-52">
          <DropdownMenuLabel className="text-xs text-muted-foreground">Text color</DropdownMenuLabel>
          <div className="grid grid-cols-5 gap-1 p-1">
            {BLOCK_COLOR_KEYS.map((k) => (
              <Swatch key={`t-${k}`} colorKey={k} mode="text" onClick={() => onColor(k)} />
            ))}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs text-muted-foreground">Background</DropdownMenuLabel>
          <div className="grid grid-cols-5 gap-1 p-1">
            {BLOCK_COLOR_KEYS.map((k) => (
              <Swatch key={`b-${k}`} colorKey={k} mode="bg" onClick={() => onBg(k)} />
            ))}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <Separator orientation="vertical" className="h-5" />

      <ToolButton onClick={onDelete} variant="destructive" title="Delete (Del/Backspace)">
        <Trash2 className="h-3.5 w-3.5" /> Delete
      </ToolButton>

      <Button
        variant="ghost"
        size="icon"
        onClick={clear}
        aria-label="Clear selection (Esc)"
        title="Clear (Esc)"
        className="ml-1 h-7 w-7 rounded text-muted-foreground [&_svg]:size-3.5"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function ToolButton({
  children, onClick, variant, title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: "destructive";
  title?: string;
}) {
  return (
    <Button
      variant={variant === "destructive" ? "ghost" : "ghost"}
      onClick={onClick}
      title={title}
      className={cn(
        "h-auto gap-1 rounded px-2 py-1 text-xs font-normal [&_svg]:size-3.5",
        variant === "destructive" && "text-destructive hover:bg-destructive/10 hover:text-destructive",
      )}
    >
      {children}
    </Button>
  );
}

function Swatch({
  colorKey, mode, onClick,
}: {
  colorKey: BlockColorKey;
  mode: "text" | "bg";
  onClick: () => void;
}) {
  const meta = BLOCK_COLORS[colorKey];
  return (
    <Button
      variant="outline"
      size="icon"
      onClick={onClick}
      title={meta.label}
      aria-label={`${mode === "text" ? "Text" : "Background"}: ${meta.label}`}
      className={cn(
        "h-7 w-7 p-0 rounded border-border hover:ring-2 hover:ring-brand",
        mode === "text" ? meta.swatch : (meta.bg || "bg-transparent"),
      )}
    >
      {mode === "text" && colorKey !== "default" && (
        <span className="text-[10px] font-bold text-background">A</span>
      )}
    </Button>
  );
}
