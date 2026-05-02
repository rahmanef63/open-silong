import { useEffect, useRef, useState } from "react";
import { BLOCK_SPECS } from "./blockSpecs";
import { BlockType } from "@/shared/types/domain";
import { cn } from "@/shared/lib/utils";

interface Props {
  query: string;
  onSelect: (type: BlockType) => void;
  onClose: () => void;
}

export function SlashMenu({ query, onSelect, onClose }: Props) {
  const filtered = BLOCK_SPECS.filter(s => {
    const q = query.toLowerCase();
    if (!q) return true;
    return s.label.toLowerCase().includes(q) || s.keywords.some(k => k.startsWith(q));
  });
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setActive(0); }, [query]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") { e.preventDefault(); setActive(a => Math.min(filtered.length - 1, a + 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setActive(a => Math.max(0, a - 1)); }
      else if (e.key === "Enter") { e.preventDefault(); if (filtered[active]) onSelect(filtered[active].type); }
      else if (e.key === "Escape") { e.preventDefault(); onClose(); }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [filtered, active, onSelect, onClose]);

  if (filtered.length === 0) {
    return (
      <div className="absolute z-50 mt-1 w-72 rounded-lg border border-border bg-popover p-2 shadow-pop animate-fade-in">
        <div className="text-xs text-muted-foreground p-2">No matching blocks</div>
      </div>
    );
  }

  return (
    <div ref={listRef} className="absolute z-50 mt-1 w-72 max-h-72 overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-pop animate-fade-in">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-2 py-1.5">Basic blocks</div>
      {filtered.map((spec, i) => {
        const Icon = spec.icon;
        return (
          <button
            key={spec.type}
            onClick={() => onSelect(spec.type)}
            onMouseEnter={() => setActive(i)}
            className={cn(
              "flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left transition",
              i === active && "bg-accent"
            )}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium">{spec.label}</div>
              <div className="text-xs text-muted-foreground truncate">{spec.hint}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
