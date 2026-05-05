"use client";

import * as React from "react";
import { Search, Smile, Shapes, Trash2, Shuffle } from "lucide-react";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/ui/tabs";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { cn } from "@/shared/lib/utils";
import { EMOJI_GROUPS, ALL_EMOJIS } from "../lib/emoji-catalog";
import { LUCIDE_GROUPS, ALL_LUCIDE } from "../lib/lucide-catalog";
import { lucideValue, parseIconValue } from "../lib/parse";
import { DynamicIcon } from "./DynamicIcon";

interface IconPickerInlineProps {
  value: string | null | undefined;
  /** Receives the full stored form: raw emoji or `lucide:Name`. */
  onChange: (next: string) => void;
  /** Optional clear handler; renders a Clear button when provided. */
  onClear?: () => void;
  className?: string;
}

/** Inline picker — emoji + lucide tabs with search. Use embedded inside
 *  dialogs/sheets. For a triggered popover, see `IconPickerPopover`. */
export function IconPickerInline({ value, onChange, onClear, className }: IconPickerInlineProps) {
  const parsed = parseIconValue(value);
  const initialTab = parsed.kind === "lucide" ? "lucide" : "emoji";
  const [tab, setTab] = React.useState<string>(initialTab);
  const [query, setQuery] = React.useState("");

  const filteredEmoji = React.useMemo(() => {
    if (!query) return null;
    const q = query.toLowerCase();
    // Loose contains; emoji catalog has no labels so match by exact glyph too.
    return ALL_EMOJIS.filter((e) => e.includes(q));
  }, [query]);

  const filteredLucide = React.useMemo(() => {
    if (!query) return null;
    const q = query.toLowerCase();
    return ALL_LUCIDE.filter((n) => n.toLowerCase().includes(q));
  }, [query]);

  function pickRandom() {
    if (tab === "lucide") {
      const n = ALL_LUCIDE[Math.floor(Math.random() * ALL_LUCIDE.length)];
      onChange(lucideValue(n));
    } else {
      const e = ALL_EMOJIS[Math.floor(Math.random() * ALL_EMOJIS.length)];
      onChange(e);
    }
  }

  return (
    <div className={cn("w-full space-y-3", className)}>
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <div className="flex items-center gap-2">
          <TabsList className="h-8">
            <TabsTrigger value="emoji" className="h-7 text-xs gap-1">
              <Smile className="h-3.5 w-3.5" /> Emoji
            </TabsTrigger>
            <TabsTrigger value="lucide" className="h-7 text-xs gap-1">
              <Shapes className="h-3.5 w-3.5" /> Icons
            </TabsTrigger>
          </TabsList>
          <div className="ml-auto flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={pickRandom}
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

        <div className="relative mt-2">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder={tab === "lucide" ? "Search lucide icons…" : "Search emoji…"}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-7 h-8 text-sm"
          />
        </div>

        <TabsContent value="emoji" className="mt-2">
          <ScrollArea className="h-64 pr-2">
            {filteredEmoji ? (
              <Grid>
                {filteredEmoji.map((e, i) => (
                  <EmojiCell key={`${e}-${i}`} emoji={e} active={value === e} onClick={() => onChange(e)} />
                ))}
                {filteredEmoji.length === 0 && <Empty />}
              </Grid>
            ) : (
              <div className="space-y-3">
                {EMOJI_GROUPS.map((g) => (
                  <section key={g.id}>
                    <h4 className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {g.label}
                    </h4>
                    <Grid>
                      {g.items.map((e, i) => (
                        <EmojiCell key={`${g.id}-${e}-${i}`} emoji={e} active={value === e} onClick={() => onChange(e)} />
                      ))}
                    </Grid>
                  </section>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="lucide" className="mt-2">
          <ScrollArea className="h-64 pr-2">
            {filteredLucide ? (
              <Grid>
                {filteredLucide.map((n) => (
                  <LucideCell key={n} name={n} active={value === lucideValue(n)} onClick={() => onChange(lucideValue(n))} />
                ))}
                {filteredLucide.length === 0 && <Empty />}
              </Grid>
            ) : (
              <div className="space-y-3">
                {LUCIDE_GROUPS.map((g) => (
                  <section key={g.id}>
                    <h4 className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {g.label}
                    </h4>
                    <Grid>
                      {g.items.map((n) => (
                        <LucideCell key={`${g.id}-${n}`} name={n} active={value === lucideValue(n)} onClick={() => onChange(lucideValue(n))} />
                      ))}
                    </Grid>
                  </section>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface IconPickerPopoverProps extends IconPickerInlineProps {
  /** Trigger element. When omitted, renders a 40px button showing current icon. */
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  align?: "start" | "center" | "end";
  side?: "top" | "right" | "bottom" | "left";
}

/** Popover-wrapped picker. Click trigger → 320px popover with full picker. */
export function IconPickerPopover({
  value,
  onChange,
  onClear,
  children,
  open,
  onOpenChange,
  align = "start",
  side = "bottom",
}: IconPickerPopoverProps) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        {children ?? (
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border text-2xl hover:bg-accent transition"
            aria-label="Change icon"
          >
            <DynamicIcon value={value} />
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent align={align} side={side} className="w-[340px] p-3">
        <IconPickerInline value={value} onChange={onChange} onClear={onClear} />
      </PopoverContent>
    </Popover>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-8 gap-1">{children}</div>;
}

function EmojiCell({ emoji, active, onClick }: { emoji: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded text-lg leading-none transition",
        active ? "bg-brand/15 ring-1 ring-brand" : "hover:bg-accent",
      )}
      title={emoji}
    >
      {emoji}
    </button>
  );
}

function LucideCell({ name, active, onClick }: { name: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded transition",
        active ? "bg-brand/15 ring-1 ring-brand" : "hover:bg-accent",
      )}
      title={name}
    >
      <DynamicIcon value={lucideValue(name)} className="text-base" />
    </button>
  );
}

function Empty() {
  return (
    <div className="col-span-full py-6 text-center text-xs text-muted-foreground">
      No matches.
    </div>
  );
}
