"use client";

import { useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { ChevronDown, Monitor, Moon, Palette, RotateCcw, Sun } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { cn } from "@/shared/lib/utils";
import {
  applyTweakcnPreset,
  bootTweakcnPreset,
  clearTweakcnPreset,
  getSavedTweakcnPreset,
  groupTweakcnPresets,
  loadTweakcnRegistry,
  previewTweakcnPreset,
  restoreTweakcnPreset,
  tweakcnSwatches,
  type TweakcnPresetGroup,
  type TweakcnPresetItem,
  type TweakcnRegistry,
} from "../lib/tweakcn";

interface TweakcnSwitcherProps {
  size?: "sm" | "mobile";
  triggerClassName?: string;
}

const MODES = [
  { id: "light", label: "Light", Icon: Sun },
  { id: "dark", label: "Dark", Icon: Moon },
  { id: "system", label: "System", Icon: Monitor },
] as const;

type ModeId = (typeof MODES)[number]["id"];

/**
 * Tweakcn preset switcher (separate from the existing simple
 * ThemePicker). Loads the ~36-preset registry from /r/registry.json
 * and lets the user pick by curated mood group, with hover-preview
 * and click-to-commit semantics.
 *
 * Not wired into the chrome — caller imports and places it.
 */
export function TweakcnSwitcher({
  size = "sm",
  triggerClassName,
}: TweakcnSwitcherProps) {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [registry, setRegistry] = useState<TweakcnRegistry | null>(null);
  const [presetName, setPresetName] = useState<string | null>(null);

  // Boot persisted preset + load registry on first mount.
  useEffect(() => {
    void bootTweakcnPreset();
    setPresetName(getSavedTweakcnPreset());
    let cancelled = false;
    loadTweakcnRegistry()
      .then((r) => {
        if (!cancelled) setRegistry(r);
      })
      .catch(() => {
        // ignore — UI renders empty
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const groups: TweakcnPresetGroup<TweakcnPresetItem>[] = useMemo(() => {
    if (!registry) return [];
    return groupTweakcnPresets(registry.items);
  }, [registry]);

  const presetCount = useMemo(
    () => groups.reduce((sum, g) => sum + g.items.length, 0),
    [groups],
  );

  const activeMode: ModeId =
    theme === "light" || theme === "dark" || theme === "system"
      ? theme
      : "system";

  const commit = (name: string) => {
    setPresetName(name);
    void applyTweakcnPreset(name);
    setOpen(false);
  };

  const resetDefault = () => {
    setPresetName(null);
    clearTweakcnPreset();
    setOpen(false);
  };

  const preview = (name: string) => {
    void previewTweakcnPreset(name);
  };

  const restore = () => {
    void restoreTweakcnPreset();
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (!next) restore();
        setOpen(next);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Theme and color preset"
          className={cn(
            size === "mobile" && "h-11 w-11",
            "gap-1.5",
            triggerClassName,
          )}
        >
          <Palette className="h-4 w-4" />
          <ChevronDown
            className={cn(
              "h-3 w-3 transition-transform opacity-70",
              open && "rotate-180",
            )}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        collisionPadding={8}
        avoidCollisions
        className="flex h-[min(80vh,34rem)] w-[min(20rem,calc(100vw-1rem))] sm:w-80 flex-col p-0 overflow-hidden"
        onMouseLeave={() => restore()}
      >
        <div className="sticky top-0 z-20 shrink-0 border-b border-border bg-popover/95 px-3 py-2 backdrop-blur">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Display Mode
          </p>
          <div
            role="tablist"
            aria-label="Display mode"
            className="grid grid-cols-3 gap-1 rounded-md bg-muted/60 p-1"
          >
            {MODES.map(({ id, label, Icon }) => {
              const active = id === activeMode;
              return (
                <button
                  key={id}
                  role="tab"
                  aria-selected={active}
                  type="button"
                  onClick={() => setTheme(id)}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded px-2 py-1.5 text-xs font-medium transition-colors",
                    active
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-2">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Tweakcn Preset{" "}
            <span className="font-normal text-muted-foreground/70">
              ({presetCount})
            </span>
          </span>
          <button
            type="button"
            onClick={resetDefault}
            onMouseEnter={() => previewTweakcnPreset(null)}
            onMouseLeave={() => restore()}
            className={cn(
              "flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
              presetName === null && "text-brand",
            )}
          >
            <RotateCcw className="h-3 w-3" />
            Default
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {groups.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Loading presets…
            </p>
          )}
          {groups.map((grp) => (
            <div key={grp.id}>
              <div className="sticky top-0 z-10 border-b border-border/30 bg-popover/95 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur">
                {grp.label}
              </div>
              {grp.items.map((p) => {
                const selected = p.name === presetName;
                const swatches = tweakcnSwatches(p);
                return (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => commit(p.name)}
                    onMouseEnter={() => preview(p.name)}
                    onFocus={() => preview(p.name)}
                    className={cn(
                      "flex w-full items-center gap-3 border-b border-border/40 px-3 py-2 text-left text-sm transition-colors",
                      "hover:bg-accent hover:text-accent-foreground",
                      selected && "bg-accent text-accent-foreground",
                    )}
                    aria-pressed={selected}
                  >
                    <span className="flex shrink-0 items-center gap-0.5">
                      {swatches.map((c, i) => (
                        <span
                          key={i}
                          aria-hidden
                          className="block h-3 w-3 rounded-full border border-border/60"
                          style={{ background: c }}
                        />
                      ))}
                    </span>
                    <span className="flex-1 truncate">{p.title}</span>
                    {selected && (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
