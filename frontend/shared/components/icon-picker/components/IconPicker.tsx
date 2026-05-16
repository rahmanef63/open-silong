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
import { useRecentIcons, pushRecent } from "../lib/recents";
import { buildEmojiSearchHaystack } from "../lib/emoji-keywords";
import { DynamicIcon } from "./DynamicIcon";
import { Grid, EmojiCell, LucideCell, RecentCell, Empty } from "./picker-parts/cells";
import { PickerToolbar } from "./picker-parts/Toolbar";
import { ColorRow } from "./picker-parts/ColorRow";

interface IconPickerInlineProps {
  value: string | null | undefined;
  onChange: (next: string) => void;
  onClear?: () => void;
  className?: string;
}

type Tab = "emoji" | "lucide";

/** Precomputed lowercase search index — built once at module load, NOT
 *  on every keystroke. ~600 entries; constant work amortized. */
const EMOJI_HAYSTACKS: ReadonlyMap<string, string> = (() => {
  const map = new Map<string, string>();
  for (const e of ALL_EMOJIS) map.set(e, buildEmojiSearchHaystack(e));
  return map;
})();

const LUCIDE_LOWER: ReadonlyMap<string, string> = (() => {
  const map = new Map<string, string>();
  for (const n of ALL_LUCIDE) map.set(n, n.toLowerCase());
  return map;
})();

/** Inline picker — emoji + lucide tabs, search, color row, twemoji toggle.
 *
 *  Performance contract:
 *    - One `useIconStyle` subscription (this component), passed down as
 *      a prop to every cell via `RawIcon` — zero per-cell subscriptions.
 *    - Search filter runs inside `startTransition` so the input stays
 *      responsive on keystroke even with large catalogs.
 *    - Each section uses `content-visibility: auto` on its grid so the
 *      browser skips paint for offscreen rows. Free virtualization.
 *    - Cells are `React.memo` and receive primitive props only. */
export function IconPickerInline({ value, onChange, onClear, className }: IconPickerInlineProps) {
  const parsed = parseIconValue(value);
  const initialTab: Tab = parsed.kind === "lucide" ? "lucide" : "emoji";
  const [tab, setTab] = React.useState<Tab>(initialTab);
  const [queryInput, setQueryInput] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [isPending, startTransition] = React.useTransition();
  const [iconStyle, setIconStyle] = useIconStyle();
  const recents = useRecentIcons();

  const currentColor = parsed.kind !== "empty" ? parsed.color : undefined;

  // Filtering. Done over precomputed lowercase haystacks so every keystroke
  // is one allocation-free pass over the catalog. startTransition keeps the
  // input thread free.
  React.useEffect(() => {
    startTransition(() => setQuery(queryInput.trim().toLowerCase()));
  }, [queryInput]);

  const filteredEmoji = React.useMemo(() => {
    if (!query) return null;
    const out: string[] = [];
    for (const e of ALL_EMOJIS) {
      const hay = EMOJI_HAYSTACKS.get(e);
      if (hay && hay.includes(query)) out.push(e);
    }
    return out;
  }, [query]);

  const filteredLucide = React.useMemo(() => {
    if (!query) return null;
    const out: string[] = [];
    for (const n of ALL_LUCIDE) {
      const hay = LUCIDE_LOWER.get(n);
      if (hay && hay.includes(query)) out.push(n);
    }
    return out;
  }, [query]);

  function commit(nextValue: string) {
    onChange(nextValue);
    pushRecent(nextValue);
  }
  function pickEmoji(e: string) { commit(withColor(e, currentColor)); }
  function pickLucide(n: string) { commit(lucideValue(n, currentColor)); }
  function pickRecent(v: string) {
    // Recents already include the color suffix the user committed to,
    // so apply currentColor only if the recent has no embedded color.
    const re = parseIconValue(v);
    if (re.kind === "empty") return;
    if (re.color) { onChange(v); pushRecent(v); return; }
    if (re.kind === "lucide") commit(lucideValue(re.name, currentColor));
    else commit(withColor(re.emoji, currentColor));
  }
  function pickColor(hex: string) {
    if (parsed.kind === "empty") return;
    const base = parsed.kind === "lucide" ? `lucide:${parsed.name}` : parsed.emoji;
    onChange(withColor(base, hex || undefined));
  }
  function pickRandom() {
    if (tab === "lucide") {
      const n = ALL_LUCIDE[Math.floor(Math.random() * ALL_LUCIDE.length)];
      commit(lucideValue(n, currentColor));
    } else {
      const e = ALL_EMOJIS[Math.floor(Math.random() * ALL_EMOJIS.length)];
      commit(withColor(e, currentColor));
    }
  }

  // Keyboard nav inside the grid. Arrow keys walk the visible cells;
  // Enter activates the focused button (native behaviour, no special
  // handling needed). 8-col grid is hardcoded.
  const gridRef = React.useRef<HTMLDivElement | null>(null);
  function handleGridKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft" && e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    const target = e.target as HTMLElement;
    const idxStr = target.getAttribute("data-icon-cell-index");
    if (!idxStr) return;
    const cells = gridRef.current?.querySelectorAll<HTMLElement>("[data-icon-cell-index]");
    if (!cells || cells.length === 0) return;
    const idx = Number(idxStr);
    const delta = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : e.key === "ArrowDown" ? 8 : -8;
    const next = Math.max(0, Math.min(cells.length - 1, idx + delta));
    if (next === idx) return;
    e.preventDefault();
    cells[next]?.focus();
  }

  return (
    <div className={cn("w-full space-y-3", className)} onKeyDown={handleGridKeyDown} ref={gridRef}>
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="w-full">
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
            placeholder={tab === "lucide" ? "Search lucide icons…" : "Search emoji (try: heart, star, fire)…"}
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            className={cn("pl-7 h-8 text-sm", isPending && "opacity-80")}
            aria-busy={isPending}
          />
        </div>

        <TabsContent value="emoji" className="mt-2">
          <ScrollArea className="h-64 pr-2">
            {filteredEmoji ? (
              <Grid>
                {filteredEmoji.length === 0 ? <Empty /> : filteredEmoji.map((e, i) => (
                  <EmojiCell
                    key={`f-${e}-${i}`}
                    emoji={e}
                    style={iconStyle}
                    active={parsed.kind === "emoji" && parsed.emoji === e}
                    onClick={() => pickEmoji(e)}
                    tabIndex={i === 0 ? 0 : -1}
                    index={i}
                  />
                ))}
              </Grid>
            ) : (
              <div className="space-y-3">
                {recents.length > 0 && (
                  <SectionRecents
                    recents={recents}
                    style={iconStyle}
                    activeValue={value ?? ""}
                    onPick={pickRecent}
                  />
                )}
                {EMOJI_GROUPS.map((g) => (
                  <Section key={g.id} label={g.label}>
                    {g.items.map((e, i) => (
                      <EmojiCell
                        key={`${g.id}-${e}-${i}`}
                        emoji={e}
                        style={iconStyle}
                        active={parsed.kind === "emoji" && parsed.emoji === e}
                        onClick={() => pickEmoji(e)}
                      />
                    ))}
                  </Section>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="lucide" className="mt-2">
          <ScrollArea className="h-64 pr-2">
            {filteredLucide ? (
              <Grid>
                {filteredLucide.length === 0 ? <Empty /> : filteredLucide.map((n, i) => (
                  <LucideCell
                    key={`f-${n}`}
                    name={n}
                    color={currentColor}
                    style={iconStyle}
                    active={parsed.kind === "lucide" && parsed.name === n}
                    onClick={() => pickLucide(n)}
                    tabIndex={i === 0 ? 0 : -1}
                    index={i}
                  />
                ))}
              </Grid>
            ) : (
              <div className="space-y-3">
                {recents.length > 0 && (
                  <SectionRecents
                    recents={recents}
                    style={iconStyle}
                    activeValue={value ?? ""}
                    onPick={pickRecent}
                  />
                )}
                {LUCIDE_GROUPS.map((g) => (
                  <Section key={g.id} label={g.label}>
                    {g.items.map((n) => (
                      <LucideCell
                        key={`${g.id}-${n}`}
                        name={n}
                        color={currentColor}
                        style={iconStyle}
                        active={parsed.kind === "lucide" && parsed.name === n}
                        onClick={() => pickLucide(n)}
                      />
                    ))}
                  </Section>
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

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      <h4 className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</h4>
      <Grid>{children}</Grid>
    </section>
  );
}

function SectionRecents({
  recents, style, activeValue, onPick,
}: { recents: readonly string[]; style: import("../lib/style-pref").Style; activeValue: string; onPick: (v: string) => void }) {
  return (
    <section>
      <h4 className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Recent</h4>
      <Grid>
        {recents.map((v, i) => (
          <RecentCell
            key={`r-${v}-${i}`}
            value={v}
            style={style}
            active={v === activeValue}
            onClick={() => onPick(v)}
          />
        ))}
      </Grid>
    </section>
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
  // Defer mounting the picker body until first open so the catalog work
  // (grid allocation, twemoji image elements) happens on user intent
  // rather than on the parent page's first paint. Once opened, the body
  // stays mounted so subsequent opens are instant.
  const [everOpened, setEverOpened] = React.useState(false);
  React.useEffect(() => { if (open) setEverOpened(true); }, [open]);

  function handleOpenChange(next: boolean) {
    if (next) setEverOpened(true);
    onOpenChange?.(next);
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
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
        {everOpened ? (
          <IconPickerInline value={value} onChange={onChange} onClear={onClear} />
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
