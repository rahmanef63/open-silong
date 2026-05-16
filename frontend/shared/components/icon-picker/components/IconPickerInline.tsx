"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { Input } from "@/shared/ui/input";
import { Tabs, TabsContent } from "@/shared/ui/tabs";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { cn } from "@/shared/lib/utils";
import { EMOJI_GROUPS, ALL_EMOJIS } from "../lib/emoji-catalog";
import { LUCIDE_GROUPS, ALL_LUCIDE } from "../lib/lucide-catalog";
import { lucideValue, parseIconValue, withColor } from "../lib/parse";
import { useIconStyle, type Style } from "../lib/style-pref";
import { useRecentIcons, pushRecent } from "../lib/recents";
import { buildEmojiSearchHaystack } from "../lib/emoji-keywords";
import { EmojiCell, LucideCell, RecentCell, Grid, Empty } from "./picker-parts/cells";
import { PickerToolbar } from "./picker-parts/Toolbar";
import { ColorRow } from "./picker-parts/ColorRow";

export interface IconPickerInlineProps {
  value: string | null | undefined;
  /** Fired on every value change — icon pick, color pick, clear. The
   *  consumer should persist `next` but should NOT close the picker
   *  itself; the popover handles close via `onSelect`. */
  onChange: (next: string) => void;
  onClear?: () => void;
  /** Fired ONLY on icon-pick events (emoji / lucide / recent / random /
   *  clear). NOT fired on color pick. The popover hooks this to close
   *  itself; external consumers can hook it for analytics or focus
   *  management. */
  onSelect?: () => void;
  className?: string;
}

type Tab = "emoji" | "lucide";

/** Precomputed lowercase search haystacks. Built once at module load. */
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

/** Inline picker — emoji + lucide tabs, search, color row (lucide only),
 *  twemoji toggle, recents, keyboard nav.
 *
 *  Perf contract: ONE `useIconStyle` subscription here, propagated as a
 *  prop to every cell via `RawIcon` (zero per-cell hooks).
 *  Grids use `content-visibility: auto` for free row windowing.
 *  Search filter runs in `startTransition` over a precomputed haystack. */
export function IconPickerInline({ value, onChange, onClear, onSelect, className }: IconPickerInlineProps) {
  const parsed = parseIconValue(value);
  const initialTab: Tab = parsed.kind === "lucide" ? "lucide" : "emoji";
  const [tab, setTab] = React.useState<Tab>(initialTab);
  const [queryInput, setQueryInput] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [isPending, startTransition] = React.useTransition();
  const [iconStyle, setIconStyle] = useIconStyle();
  const recents = useRecentIcons();

  // Color only makes sense for monochrome lucide SVGs. Twemoji has its
  // own baked palette — tinting it would either no-op or look wrong.
  // Hide the color row entirely on the emoji tab.
  const colorEnabled = tab === "lucide";
  const currentColor = colorEnabled && parsed.kind !== "empty" ? parsed.color : undefined;

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

  // Icon-pick path: commits value + bumps recents + signals close intent.
  function commit(nextValue: string) {
    onChange(nextValue);
    pushRecent(nextValue);
    onSelect?.();
  }
  function pickEmoji(e: string) {
    // Emoji values never carry color — strip any leftover suffix.
    commit(withColor(e, undefined));
  }
  function pickLucide(n: string) { commit(lucideValue(n, currentColor)); }
  function pickRecent(v: string) {
    const re = parseIconValue(v);
    if (re.kind === "empty") return;
    // Honor the recent's embedded color when present (for lucide); when
    // the recent is emoji or has no color, fall through to the active
    // color rules.
    if (re.color) { onChange(v); pushRecent(v); onSelect?.(); return; }
    if (re.kind === "lucide") commit(lucideValue(re.name, currentColor));
    else commit(withColor(re.emoji, undefined));
  }
  // Color-pick path: re-applies color to the current lucide value. Does
  // NOT call onSelect — popover stays open so user can continue tweaking.
  function pickColor(hex: string) {
    if (!colorEnabled) return;
    if (parsed.kind !== "lucide") return;
    const base = `lucide:${parsed.name}`;
    onChange(withColor(base, hex || undefined));
    // Intentionally no onSelect.
  }
  function pickRandom() {
    if (tab === "lucide") {
      const n = ALL_LUCIDE[Math.floor(Math.random() * ALL_LUCIDE.length)];
      commit(lucideValue(n, currentColor));
    } else {
      const e = ALL_EMOJIS[Math.floor(Math.random() * ALL_EMOJIS.length)];
      commit(withColor(e, undefined));
    }
  }
  function handleClear() {
    onClear?.();
    onSelect?.();
  }

  // Keyboard nav inside the grid. Arrow keys walk the visible cells
  // via data-icon-cell-index; Enter activates (native button).
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
          onClear={onClear ? handleClear : undefined}
        />

        {colorEnabled && <ColorRow currentColor={currentColor} onPick={pickColor} />}

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
                  <RecentsSection
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
                  <RecentsSection
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

function RecentsSection({
  recents, style, activeValue, onPick,
}: { recents: readonly string[]; style: Style; activeValue: string; onPick: (v: string) => void }) {
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

export default IconPickerInline;
