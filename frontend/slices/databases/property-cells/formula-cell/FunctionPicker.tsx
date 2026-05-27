"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Input } from "@/shared/ui/input";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/shared/ui/popover";
import { Button } from "@/shared/ui/button";
import {
  SIGNATURES, functionsByGroup,
} from "../../lib/formulaEngine/functions";
import type { FnGroup } from "../../lib/formulaEngine/functions/_registry";

/** Tag color per group — semantic over arbitrary so the picker reads at
 *  a glance. Theme tokens only (no hex per CLAUDE.md). */
const GROUP_TAG: Record<FnGroup, string> = {
  ref:    "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
  string: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  number: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  date:   "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  list:   "bg-purple-500/10 text-purple-700 dark:text-purple-300",
  logic:  "bg-rose-500/10 text-rose-700 dark:text-rose-300",
};

/** Render a signature like `dateAdd(d, n, unit)` from its arg list. */
function renderSignature(name: string, args: ReadonlyArray<string>): string {
  return `${name}(${args.join(", ")})`;
}

export interface FunctionPickerProps {
  /** Called with the canonical name of the picked function. Caller is
   *  responsible for inserting `name()` at the caret + positioning cursor. */
  onPick: (name: string) => void;
  /** Render-prop for the trigger button. Defaults to a small "fx" button. */
  trigger?: React.ReactNode;
}

export function FunctionPicker({ onPick, trigger }: FunctionPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const groups = useMemo(() => functionsByGroup(), []);

  /** Filter — match name OR description, case-insensitive. Empty query
   *  shows everything grouped. */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    const out: Record<FnGroup, string[]> = {
      ref: [], string: [], number: [], date: [], list: [], logic: [],
    };
    for (const [g, names] of Object.entries(groups) as Array<[FnGroup, string[]]>) {
      out[g] = names.filter((n) => {
        if (n.toLowerCase().includes(q)) return true;
        return SIGNATURES[n].desc.toLowerCase().includes(q);
      });
    }
    return out;
  }, [groups, query]);

  const isEmpty = (Object.values(filtered) as string[][]).every((arr) => arr.length === 0);

  const pick = (name: string) => {
    onPick(name);
    setOpen(false);
    setQuery("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger ?? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2 font-mono text-[11px]"
            title="Insert function"
          >
            fx ▾
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0">
        <div className="border-b border-border p-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search functions…"
              className="h-8 pl-7 text-xs"
            />
          </div>
        </div>
        <div className="max-h-80 overflow-y-auto py-1">
          {isEmpty && (
            <div className="px-3 py-4 text-center text-[11px] text-muted-foreground">
              No functions match “{query}”.
            </div>
          )}
          {(Object.entries(filtered) as Array<[FnGroup, string[]]>).map(([group, names]) => {
            if (names.length === 0) return null;
            return (
              <div key={group} className="px-1 py-1">
                <div className={cn(
                  "mx-1 mb-0.5 inline-block rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
                  GROUP_TAG[group],
                )}>
                  {group}
                </div>
                <ul className="space-y-0.5">
                  {names.map((name) => {
                    const sig = SIGNATURES[name];
                    return (
                      <li key={name}>
                        <button
                          type="button"
                          onClick={() => pick(name)}
                          className="group flex w-full flex-col items-start gap-0 rounded-sm px-2 py-1 text-left transition-colors hover:bg-accent"
                        >
                          <span className="font-mono text-[11px] text-foreground">
                            {renderSignature(name, sig.args)}
                          </span>
                          <span className="text-[10px] text-muted-foreground group-hover:text-foreground/70">
                            {sig.desc} · → <span className="font-mono">{sig.returns}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
