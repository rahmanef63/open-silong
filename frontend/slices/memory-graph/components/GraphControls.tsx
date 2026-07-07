"use client";

/** Obsidian-style graph controls in a shadcn Sheet: filters (tags / orphans /
 *  ghosts), forces (center / repel / link distance), and display (arrows /
 *  label fade / node size / link thickness). Fully controlled — the parent
 *  owns the config state so the same settings can drive the live canvas.
 */

import type { ReactNode } from "react";
import { SlidersHorizontal, RotateCcw } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Slider } from "@/shared/ui/slider";
import { Switch } from "@/shared/ui/switch";
import { Separator } from "@/shared/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/ui/sheet";
import {
  DEFAULT_DISPLAY,
  DEFAULT_FILTER,
  DEFAULT_FORCE,
  DISPLAY_BOUNDS,
  FORCE_BOUNDS,
  type DisplayConfig,
  type FilterConfig,
  type ForceConfig,
} from "../lib/forceConfig";

export interface GraphControlsProps {
  filter: FilterConfig;
  onFilterChange: (next: FilterConfig) => void;
  force: ForceConfig;
  onForceChange: (next: ForceConfig) => void;
  display: DisplayConfig;
  onDisplayChange: (next: DisplayConfig) => void;
}

export function GraphControls({
  filter,
  onFilterChange,
  force,
  onForceChange,
  display,
  onDisplayChange,
}: GraphControlsProps) {
  const reset = () => {
    onFilterChange(DEFAULT_FILTER);
    onForceChange(DEFAULT_FORCE);
    onDisplayChange(DEFAULT_DISPLAY);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 [&_svg]:size-3.5">
          <SlidersHorizontal className="size-3.5" />
          <span className="hidden sm:inline">Controls</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80 overflow-y-auto sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>Graph settings</SheetTitle>
          <SheetDescription>Tune what shows and how it moves.</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <Section title="Filters">
            <ToggleRow
              label="Tags"
              checked={filter.includeTags}
              onCheckedChange={(v) => onFilterChange({ ...filter, includeTags: v })}
            />
            <ToggleRow
              label="Unresolved links"
              checked={filter.includeGhosts}
              onCheckedChange={(v) => onFilterChange({ ...filter, includeGhosts: v })}
            />
            <ToggleRow
              label="Orphans"
              checked={filter.includeOrphans}
              onCheckedChange={(v) => onFilterChange({ ...filter, includeOrphans: v })}
            />
          </Section>

          <Separator />

          <Section title="Forces">
            <SliderRow
              label="Center force"
              value={force.centerStrength}
              bounds={FORCE_BOUNDS.centerStrength}
              onChange={(v) => onForceChange({ ...force, centerStrength: v })}
            />
            <SliderRow
              label="Repel force"
              value={force.repelStrength}
              bounds={FORCE_BOUNDS.repelStrength}
              onChange={(v) => onForceChange({ ...force, repelStrength: v })}
            />
            <SliderRow
              label="Link distance"
              value={force.linkDistance}
              bounds={FORCE_BOUNDS.linkDistance}
              onChange={(v) => onForceChange({ ...force, linkDistance: v })}
            />
          </Section>

          <Separator />

          <Section title="Display">
            <ToggleRow
              label="Arrows"
              checked={display.showArrows}
              onCheckedChange={(v) => onDisplayChange({ ...display, showArrows: v })}
            />
            <SliderRow
              label="Text fade"
              value={display.labelThreshold}
              bounds={DISPLAY_BOUNDS.labelThreshold}
              onChange={(v) => onDisplayChange({ ...display, labelThreshold: v })}
            />
            <SliderRow
              label="Node size"
              value={display.nodeSize}
              bounds={DISPLAY_BOUNDS.nodeSize}
              onChange={(v) => onDisplayChange({ ...display, nodeSize: v })}
            />
            <SliderRow
              label="Link thickness"
              value={display.linkThickness}
              bounds={DISPLAY_BOUNDS.linkThickness}
              onChange={(v) => onDisplayChange({ ...display, linkThickness: v })}
            />
          </Section>

          <Separator />

          <Button variant="ghost" size="sm" onClick={reset} className="gap-2 [&_svg]:size-3.5">
            <RotateCcw className="size-3.5" />
            Reset to defaults
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Label className="text-sm font-normal text-foreground">{label}</Label>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function SliderRow({
  label,
  value,
  bounds,
  onChange,
}: {
  label: string;
  value: number;
  bounds: { min: number; max: number; step: number };
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-normal text-foreground">{label}</Label>
        <span className="text-xs tabular-nums text-muted-foreground">{value}</span>
      </div>
      <Slider
        min={bounds.min}
        max={bounds.max}
        step={bounds.step}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
      />
    </div>
  );
}
