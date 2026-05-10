import { useEffect, useMemo, useRef, useState } from "react";
import { Link2 } from "lucide-react";
import { BLOCK_SPECS, BlockSpec } from "./blockSpecs";
import { BlockType } from "@/shared/types/domain";
import { cn } from "@/shared/lib/utils";

interface Props {
  query: string;
  onSelect: (type: BlockType) => void;
  onClose: () => void;
  /** Optional: opt-in to "Database — linked" entry. When provided, the
   *  slash menu offers it directly under "Database — new". */
  onSelectLinkedDatabase?: () => void;
}

type Item =
  | { kind: "block"; spec: BlockSpec }
  | { kind: "linked-db"; label: string; hint: string; keywords: string[] };

const LINKED_DB_ITEM = {
  kind: "linked-db" as const,
  label: "Database — linked",
  hint: "Embed an existing database",
  keywords: ["database", "db", "linked", "link", "embed", "existing"],
};

function matches(item: Item, q: string): boolean {
  if (!q) return true;
  if (item.kind === "block") {
    return (
      item.spec.label.toLowerCase().includes(q) ||
      item.spec.keywords.some((k) => k.startsWith(q))
    );
  }
  return (
    item.label.toLowerCase().includes(q) ||
    item.keywords.some((k) => k.startsWith(q))
  );
}

export function SlashMenu({ query, onSelect, onClose, onSelectLinkedDatabase }: Props) {
  const items = useMemo<Item[]>(() => {
    const base: Item[] = BLOCK_SPECS.map((spec) => ({ kind: "block", spec }));
    if (onSelectLinkedDatabase) {
      const i = base.findIndex((it) => it.kind === "block" && it.spec.type === "database");
      if (i >= 0) base.splice(i + 1, 0, LINKED_DB_ITEM);
      else base.push(LINKED_DB_ITEM);
    }
    return base;
  }, [onSelectLinkedDatabase]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return items.filter((it) => matches(it, q));
  }, [items, query]);

  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setActive(0); }, [query]);

  const fire = (it: Item) => {
    if (it.kind === "block") onSelect(it.spec.type);
    else onSelectLinkedDatabase?.();
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(filtered.length - 1, a + 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
      else if (e.key === "Enter") { e.preventDefault(); if (filtered[active]) fire(filtered[active]); }
      else if (e.key === "Escape") { e.preventDefault(); onClose(); }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, active, onSelect, onClose, onSelectLinkedDatabase]);

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
      {filtered.map((it, i) => {
        const Icon = it.kind === "block" ? it.spec.icon : Link2;
        const label = it.kind === "block" ? it.spec.label : it.label;
        const hint = it.kind === "block" ? it.spec.hint : it.hint;
        const key = it.kind === "block" ? it.spec.type : "linked-db";
        return (
          <button
            key={key}
            onClick={() => fire(it)}
            onMouseEnter={() => setActive(i)}
            className={cn(
              "flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left transition",
              i === active && "bg-accent",
            )}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium">{label}</div>
              <div className="text-xs text-muted-foreground truncate">{hint}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
