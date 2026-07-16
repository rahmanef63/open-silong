"use client";

import { useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { ChevronDown, Palette, RotateCcw } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { cn } from "@/shared/lib/utils";
import {
  applyTweakcnPreset, bootTweakcnPreset, clearTweakcnPreset, getSavedTweakcnPreset,
  groupTweakcnPresets, loadTweakcnRegistry, previewTweakcnPreset, restoreTweakcnPreset,
  type TweakcnPresetGroup, type TweakcnPresetItem, type TweakcnRegistry,
} from "../lib/tweakcn";
import { ModeRow, type ModeId } from "./tweakcn/ModeRow";
import { PresetList } from "./tweakcn/PresetList";

interface TweakcnSwitcherProps {
  size?: "sm" | "mobile";
  triggerClassName?: string;
}

/** Tweakcn preset switcher.
 *  Loads the ~36-preset registry and lets the user pick by mood group,
 *  with hover-preview and click-to-commit semantics. */
export function TweakcnSwitcher({ size = "sm", triggerClassName }: TweakcnSwitcherProps) {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [registry, setRegistry] = useState<TweakcnRegistry | null>(null);
  const [presetName, setPresetName] = useState<string | null>(null);

  useEffect(() => {
    void bootTweakcnPreset();
    setPresetName(getSavedTweakcnPreset());
    let cancelled = false;
    loadTweakcnRegistry()
      .then((r) => { if (!cancelled) setRegistry(r); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const groups: TweakcnPresetGroup<TweakcnPresetItem>[] = useMemo(
    () => (registry ? groupTweakcnPresets(registry.items) : []),
    [registry],
  );

  const presetCount = useMemo(
    () => groups.reduce((sum, g) => sum + g.items.length, 0),
    [groups],
  );

  const activeMode: ModeId =
    theme === "light" || theme === "dark" || theme === "system" ? theme : "system";

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

  const restore = () => { void restoreTweakcnPreset(); };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => { if (!next) restore(); setOpen(next); }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Theme and color preset"
          className={cn(size === "mobile" && "h-11 w-11", "gap-1.5", triggerClassName)}
        >
          <Palette className="h-4 w-4" />
          <ChevronDown
            className={cn("h-3 w-3 transition-transform opacity-70", open && "rotate-180")}
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
        <ModeRow activeMode={activeMode} onPick={setTheme} />

        <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-2">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Tweakcn Preset{" "}
            <span className="font-normal text-muted-foreground/70">({presetCount})</span>
          </span>
          <Button
            type="button"
            variant="ghost"
            onClick={resetDefault}
            onMouseEnter={() => previewTweakcnPreset(null)}
            onMouseLeave={() => restore()}
            className={cn(
              "h-auto gap-1 px-2 py-1 text-[11px] font-normal text-muted-foreground [&_svg]:size-3",
              presetName === null && "text-brand",
            )}
          >
            <RotateCcw className="h-3 w-3" />
            Default
          </Button>
        </div>

        <PresetList
          groups={groups}
          presetName={presetName}
          onPreview={previewTweakcnPreset}
          onRestore={restore}
          onCommit={commit}
        />
      </PopoverContent>
    </Popover>
  );
}
