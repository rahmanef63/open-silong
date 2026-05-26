"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { Input } from "@/shared/ui/input";
import { Tabs, TabsContent } from "@/shared/ui/tabs";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { cn } from "@/shared/lib/utils";
import { EMOJI_GROUPS, ALL_EMOJIS } from "../lib/emoji-catalog";
import { LUCIDE_GROUPS, ALL_LUCIDE } from "../lib/lucide-catalog";
import { PHOSPHOR_GROUPS, ALL_PHOSPHOR } from "../lib/phosphor-catalog";
import { lucideValue, phosphorValue, parseIconValue, withColor } from "../lib/parse";
import { useIconStyle, type Style } from "../lib/style-pref";
import { useRecentIcons, pushRecent } from "../lib/recents";
import { buildEmojiSearchHaystack } from "../lib/emoji-keywords";
import {
  EmojiCell, LucideCell, PhosphorCell, RecentCell, Grid, Empty,
} from "./picker-parts/cells";
import { PickerToolbar, VariantPills } from "./picker-parts/Toolbar";
import { ColorRow } from "./picker-parts/ColorRow";

export interface IconPickerInlineProps {
  value: string | null | undefined;
  /** Fired on every value change — icon pick, color pick, clear. The
   *  consumer should persist `next` but should NOT close the picker
   *  itself; the popover handles close via `onSelect`. */
  onChange: (next: string) => void;
  onClear?: () => void;
  /** Fired ONLY on icon-pick events (emoji / lucide / phosphor / recent /
   *  random / clear). NOT fired on color pick. */
  onSelect?: () => void;
  className?: string;
}

type TopTab = "emoji" | "icon";
type IconVariant = "lucide" | "phosphor";

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

const PHOSPHOR_LOWER: ReadonlyMap<string, string> = (() => {
  const map = new Map<string, string>();
  for (const n of ALL_PHOSPHOR) map.set(n, n.toLowerCase());
  return map;
})();

/** Inline picker.
 *
 *  Top tabs: Emoji | Icon.
 *  Sub-variant pills:
 *    - Emoji tab → Native | Twemoji  (switches `iconStyle` global pref)
 *    - Icon tab  → Lucide (stroke) | Phosphor (fill)
 *
 *  ColorRow is shown on the Icon tab (both lucide + phosphor support color).
 *
 *  Perf contract: ONE `useIconStyle` subscription here, propagated as a
 *  prop to every cell via `RawIcon` (zero per-cell hooks).
 *  Grids use `content-visibility: auto` for free row windowing.
 *  Search filter runs in `startTransition` over a precomputed haystack. */
export function IconPickerInline({ value, onChange, onClear, onSelect, className }: IconPickerInlineProps) {
  const parsed = parseIconValue(value);
  const initialTab: TopTab = parsed.kind === "lucide" || parsed.kind === "phosphor" ? "icon" : "emoji";
  const initialIconVariant: IconVariant = parsed.kind === "phosphor" ? "phosphor" : "lucide";

  const [tab, setTab] = React.useState<TopTab>(initialTab);
  const [iconVariant, setIconVariant] = React.useState<IconVariant>(initialIconVariant);
  const [queryInput, setQueryInput] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [isPending, startTransition] = React.useTransition();
  const [iconStyle, setIconStyle] = useIconStyle();
  const recents = useRecentIcons();

  // Color row applies to the Icon tab (both lucide + phosphor accept hex).
  const colorEnabled = tab === "icon";
  const currentColor =
    colorEnabled &&
    (parsed.kind === "lucide" || parsed.kind === "phosphor")
      ? parsed.color
      : undefined;

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

  const filteredPhosphor = React.useMemo(() => {
    if (!query) return null;
    const out: string[] = [];
    for (const n of ALL_PHOSPHOR) {
      const hay = PHOSPHOR_LOWER.get(n);
      if (hay && hay.includes(query)) out.push(n);
    }
    return out;
  }, [query]);

  function commit(nextValue: string) {
    onChange(nextValue);
    pushRecent(nextValue);
    onSelect?.();
  }
  function pickEmoji(e: string) { commit(withColor(e, undefined)); }
  function pickLucide(n: string) { commit(lucideValue(n, currentColor)); }
  function pickPhosphor(n: string) { commit(phosphorValue(n, currentColor)); }
  function pickRecent(v: string) {
    const re = parseIconValue(v);
    if (re.kind === "empty") return;
    if (re.color) { onChange(v); pushRecent(v); onSelect?.(); return; }
    if (re.kind === "lucide") commit(lucideValue(re.name, currentColor));
    else if (re.kind === "phosphor") commit(phosphorValue(re.name, currentColor));
    else commit(withColor(re.emoji, undefined));
  }
  function pickColor(hex: string) {
    if (!colorEnabled) return;
    if (parsed.kind === "lucide") {
      onChange(withColor(`lucide:${parsed.name}`, hex || undefined));
    } else if (parsed.kind === "phosphor") {
      onChange(withColor(`phosphor:${parsed.name}`, hex || undefined));
    }
  }
  function pickRandom() {
    if (tab === "icon") {
      if (iconVariant === "phosphor") {
        const n = ALL_PHOSPHOR[Math.floor(Math.random() * ALL_PHOSPHOR.length)];
        commit(phosphorValue(n, currentColor));
      } else {
        const n = ALL_LUCIDE[Math.floor(Math.random() * ALL_LUCIDE.length)];
        commit(lucideValue(n, currentColor));
      }
    } else {
      const e = ALL_EMOJIS[Math.floor(Math.random() * ALL_EMOJIS.length)];
      commit(withColor(e, undefined));
    }
  }
  function handleClear() {
    onClear?.();
    onSelect?.();
  }

  // Keyboard nav inside the grid.
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

  const searchPlaceholder =
    tab === "icon"
      ? iconVariant === "phosphor"
        ? "Search phosphor icons (fill)…"
        : "Search lucide icons (outline)…"
      : iconStyle === "twemoji"
      ? "Search emoji (twemoji)…"
      : "Search emoji (native)…";

  return (
    <div
      className={cn("flex h-full min-h-0 w-full flex-col gap-3", className)}
      onKeyDown={handleGridKeyDown}
      ref={gridRef}
    >
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as TopTab)}
        className="flex min-h-0 w-full flex-1 flex-col"
      >
        <PickerToolbar
          onRandom={pickRandom}
          onClear={onClear ? handleClear : undefined}
        />

        {/* Sub-variant pills — different choices per top tab. */}
        <div className="mt-2 flex shrink-0 items-center gap-2">
          {tab === "emoji" ? (
            <VariantPills
              value={iconStyle}
              onChange={(v: Style) => setIconStyle(v)}
              options={[
                { value: "native",  label: "Native",  hint: "Render with the OS emoji font" },
                { value: "twemoji", label: "Twemoji", hint: "Render with Twemoji SVG (Notion-style, consistent across devices)" },
              ]}
            />
          ) : (
            <VariantPills
              value={iconVariant}
              onChange={(v: IconVariant) => setIconVariant(v)}
              options={[
                { value: "lucide",   label: "Lucide",        hint: "Outline icons (stroke)" },
                { value: "phosphor", label: "Phosphor fill", hint: "Filled icons (solid) — uses chosen color" },
              ]}
            />
          )}
        </div>

        {colorEnabled && (
          <div className="mt-2 shrink-0">
            <ColorRow currentColor={currentColor} onPick={pickColor} />
          </div>
        )}

        <div className="relative mt-2 shrink-0">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            className={cn("pl-7 h-8 text-sm", isPending && "opacity-80")}
            aria-busy={isPending}
          />
        </div>

        <TabsContent value="emoji" className="mt-2 flex-1 min-h-[120px] data-[state=inactive]:hidden">
          <ScrollArea className="h-full max-h-[40dvh] pr-2">
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

        <TabsContent value="icon" className="mt-2 flex-1 min-h-[120px] data-[state=inactive]:hidden">
          <ScrollArea className="h-full max-h-[40dvh] pr-2">
            {iconVariant === "lucide" ? (
              filteredLucide ? (
                <Grid>
                  {filteredLucide.length === 0 ? <Empty /> : filteredLucide.map((n, i) => (
                    <LucideCell
                      key={`fl-${n}`}
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
              )
            ) : filteredPhosphor ? (
              <Grid>
                {filteredPhosphor.length === 0 ? <Empty /> : filteredPhosphor.map((n, i) => (
                  <PhosphorCell
                    key={`fp-${n}`}
                    name={n}
                    color={currentColor}
                    style={iconStyle}
                    active={parsed.kind === "phosphor" && parsed.name === n}
                    onClick={() => pickPhosphor(n)}
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
                {PHOSPHOR_GROUPS.map((g) => (
                  <Section key={`p-${g.id}`} label={g.label}>
                    {g.items.map((n) => (
                      <PhosphorCell
                        key={`p-${g.id}-${n}`}
                        name={n}
                        color={currentColor}
                        style={iconStyle}
                        active={parsed.kind === "phosphor" && parsed.name === n}
                        onClick={() => pickPhosphor(n)}
                      />
                    ))}
                  </Section>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
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
