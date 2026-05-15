import { useEffect, useMemo, useState } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/shared/ui/command";
import { History } from "lucide-react";
import { loadHistory, saveHistory, type HistoryEntry } from "../lib/cmdkHistory";
import {
  DEFAULT_PALETTE_LABELS,
  type CommandGroup as TCommandGroup,
  type CommandPaletteLabels,
} from "../lib/types";
import { CommandGroupList } from "./palette/CommandGroups";

interface CommandPaletteProps {
  /** Pre-built groups to render. Filtering by query is the consumer's job
   *  (or pass a hook that re-builds groups on query change via `groups`
   *  identity). */
  groups: TCommandGroup[];
  /** Optional handler invoked when a `Recent commands` history entry is
   *  selected. Receives the stored entry id. Consumers map ids → effects
   *  (e.g. "action:new-page" → createPage). */
  onHistorySelect?: (entry: HistoryEntry) => void | Promise<void>;
  /** Override the input value (controlled mode). Otherwise the palette
   *  manages its own query state. */
  query?: string;
  onQueryChange?: (q: string) => void;
  /** Labels (placeholder, empty, recent-commands heading). Defaults
   *  preserve the legacy Nosion strings for back-compat. */
  labels?: CommandPaletteLabels;
  /** Custom placeholder. Shortcut for `labels.placeholder`. */
  placeholder?: string;
  /** Controlled open state. When omitted, palette toggles via ⌘K. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Disable the built-in ⌘K / Ctrl-K hotkey. */
  disableHotkey?: boolean;
}

/** Renderless command palette. Renders `groups`, the cmdk shell, and the
 *  MRU history group. Domain wiring (which groups exist, what each item
 *  does on select) is the consumer's job — see `adapters/nosion.tsx` for
 *  the Nosion-flavoured wiring used in this repo.
 */
export function CommandPalette({
  groups,
  onHistorySelect,
  query: queryProp,
  onQueryChange,
  labels,
  placeholder,
  open: openProp,
  onOpenChange,
  disableHotkey = false,
}: CommandPaletteProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [internalQuery, setInternalQuery] = useState("");
  const open = openProp ?? internalOpen;
  const setOpen = (v: boolean) => {
    if (openProp === undefined) setInternalOpen(v);
    onOpenChange?.(v);
  };
  const query = queryProp ?? internalQuery;
  const setQuery = (v: string) => {
    if (queryProp === undefined) setInternalQuery(v);
    onQueryChange?.(v);
  };

  const resolved = { ...DEFAULT_PALETTE_LABELS, ...labels };
  const inputPlaceholder = placeholder ?? resolved.placeholder;

  useEffect(() => {
    if (disableHotkey) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, disableHotkey]);

  const [historyTick, setHistoryTick] = useState(0);
  const history = useMemo(() => loadHistory(), [historyTick, open]);
  const run = (fn: () => void | Promise<void>, track?: HistoryEntry) => () => {
    setOpen(false);
    if (track) {
      saveHistory(track);
      setHistoryTick((n) => n + 1);
    }
    void fn();
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder={inputPlaceholder}
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>{resolved.empty}</CommandEmpty>

        <CommandGroupList groups={groups} query={query} run={run} />

        {!query && history.length > 0 && (
          <CommandGroup heading={resolved.recentCommandsHeading}>
            {history.map((h) => (
              <CommandItem
                key={h.id}
                value={`hist:${h.id}`}
                onSelect={run(() => onHistorySelect?.(h), h)}
              >
                <History className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                <span className="flex-1 truncate">{h.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
