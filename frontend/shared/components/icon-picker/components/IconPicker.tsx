"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { Input } from "@/shared/ui/input";
import { Tabs, TabsContent } from "@/shared/ui/tabs";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { cn } from "@/shared/lib/utils";
import { EMOJI_GROUPS, ALL_EMOJIS } from "../lib/emoji-catalog";
import { LUCIDE_GROUPS, ALL_LUCIDE } from "../lib/lucide-catalog";
import { lucideValue, parseIconValue, withColor } from "../lib/parse";
import { useIconStyle } from "../lib/style-pref";
import { DynamicIcon } from "./DynamicIcon";
import { Grid, EmojiCell, LucideCell, Empty } from "./picker-parts/cells";
import { PickerToolbar } from "./picker-parts/Toolbar";
import { ColorRow } from "./picker-parts/ColorRow";

interface IconPickerInlineProps {
  value: string | null | undefined;
  onChange: (next: string) => void;
  onClear?: () => void;
  className?: string;
}

/** Inline picker — emoji + lucide tabs, search, color row, twemoji toggle. */
export function IconPickerInline({ value, onChange, onClear, className }: IconPickerInlineProps) {
  const parsed = parseIconValue(value);
  const initialTab = parsed.kind === "lucide" ? "lucide" : "emoji";
  const [tab, setTab] = React.useState<string>(initialTab);
  const [query, setQuery] = React.useState("");
  const [iconStyle, setIconStyle] = useIconStyle();

  const currentColor = parsed.kind !== "empty" ? parsed.color : undefined;

  const filteredEmoji = React.useMemo(() => {
    if (!query) return null;
    const q = query.toLowerCase();
    return ALL_EMOJIS.filter((e) => e.includes(q));
  }, [query]);

  const filteredLucide = React.useMemo(() => {
    if (!query) return null;
    const q = query.toLowerCase();
    return ALL_LUCIDE.filter((n) => n.toLowerCase().includes(q));
  }, [query]);

  function pickEmoji(e: string) {
    onChange(withColor(e, currentColor));
  }
  function pickLucide(n: string) {
    onChange(lucideValue(n, currentColor));
  }
  function pickColor(hex: string) {
    if (parsed.kind === "empty") return;
    const base = parsed.kind === "lucide" ? `lucide:${parsed.name}` : parsed.emoji;
    onChange(withColor(base, hex || undefined));
  }
  function pickRandom() {
    if (tab === "lucide") {
      const n = ALL_LUCIDE[Math.floor(Math.random() * ALL_LUCIDE.length)];
      onChange(lucideValue(n, currentColor));
    } else {
      const e = ALL_EMOJIS[Math.floor(Math.random() * ALL_EMOJIS.length)];
      onChange(withColor(e, currentColor));
    }
  }

  return (
    <div className={cn("w-full space-y-3", className)}>
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <PickerToolbar
          iconStyle={iconStyle}
          onToggleStyle={() => setIconStyle(iconStyle === "twemoji" ? "native" : "twemoji")}
          onRandom={pickRandom}
          onClear={onClear}
        />

        <ColorRow currentColor={currentColor} onPick={pickColor} />

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
                  <EmojiCell key={`${e}-${i}`} emoji={e} active={parsed.kind === "emoji" && parsed.emoji === e} onClick={() => pickEmoji(e)} />
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
                        <EmojiCell key={`${g.id}-${e}-${i}`} emoji={e} active={parsed.kind === "emoji" && parsed.emoji === e} onClick={() => pickEmoji(e)} />
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
                  <LucideCell key={n} name={n} color={currentColor} active={parsed.kind === "lucide" && parsed.name === n} onClick={() => pickLucide(n)} />
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
                        <LucideCell key={`${g.id}-${n}`} name={n} color={currentColor} active={parsed.kind === "lucide" && parsed.name === n} onClick={() => pickLucide(n)} />
                      ))}
                    </Grid>
                  </section>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>

      <p className="text-[10px] text-muted-foreground">
        Emoji rendered via Twemoji (CC-BY 4.0) for consistent look across devices.
      </p>
    </div>
  );
}

interface IconPickerPopoverProps extends IconPickerInlineProps {
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  align?: "start" | "center" | "end";
  side?: "top" | "right" | "bottom" | "left";
}

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
      <PopoverContent align={align} side={side} className="w-[360px] p-3">
        <IconPickerInline value={value} onChange={onChange} onClear={onClear} />
      </PopoverContent>
    </Popover>
  );
}
