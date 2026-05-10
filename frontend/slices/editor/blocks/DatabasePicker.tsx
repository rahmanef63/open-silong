import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { Popover, PopoverAnchor, PopoverContent } from "@/shared/ui/popover";
import { useStore } from "@/shared/lib/store";
import { cn } from "@/shared/lib/utils";
import { DynamicIcon } from "@/slices/icon-picker";
import { rankDatabases } from "./databasePickerRank";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onPick: (databaseId: string) => void;
}

export function DatabasePicker({ open, onOpenChange, onPick }: Props) {
  const { databases } = useStore();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLInputElement>(null);

  const ranked = useMemo(
    () => rankDatabases(databases.filter((d) => !d.trashed), q),
    [databases, q],
  );

  useEffect(() => { setActive(0); }, [q]);
  useEffect(() => { if (open) setTimeout(() => ref.current?.focus(), 10); }, [open]);

  const choose = (id: string) => {
    onPick(id);
    onOpenChange(false);
    setQ("");
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverAnchor className="block h-0 w-0" />
      <PopoverContent className="w-80 p-0" align="start" side="bottom" sideOffset={6}>
        <div className="border-b border-border p-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              ref={ref}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(ranked.length - 1, a + 1)); }
                else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
                else if (e.key === "Enter") { e.preventDefault(); if (ranked[active]) choose(ranked[active].id); }
                else if (e.key === "Escape") { e.preventDefault(); onOpenChange(false); }
              }}
              placeholder="Search databases…"
              className="w-full rounded-md border border-border bg-background pl-7 pr-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>
        <div className="max-h-80 overflow-y-auto py-1">
          {ranked.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">
              {databases.length === 0 ? "No databases yet — create one first." : "No databases match your search."}
            </div>
          ) : (
            ranked.map((r, i) => (
              <button
                key={r.id}
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(r.id)}
                className={cn(
                  "flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm",
                  i === active && "bg-accent",
                )}
              >
                <DynamicIcon value={r.icon || "🗂️"} className="text-base shrink-0" fallback="🗂️" />
                <span className="flex-1 min-w-0 truncate">{r.name}</span>
                <span className="text-[10px] text-muted-foreground">{r.rowCount} rows</span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
