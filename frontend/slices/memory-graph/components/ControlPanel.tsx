"use client";

/** Right-side graph controls panel for the memory-graph slice.
 *
 *  PURE / PRESENTATIONAL — no Convex, no store, no graph internals. Every
 *  value is controlled from props; the only local state is per-section
 *  collapse. Filters / display / forces edits are surfaced back to the host
 *  via the `on*Change` callbacks so the host owns the single source of truth.
 *
 *  Mirrors a reference "Filters / Groups / Display / Forces" panel, but styled
 *  purely with theme tokens (bg-card / border-border / text-foreground / …) —
 *  no hex, no fixed dark colours.
 */

import { useState, type ReactNode } from "react";
import {
  RotateCcw,
  X,
  Search,
  ChevronDown,
  ChevronRight,
  Play,
  Pause,
  Flame,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";
import { Slider } from "@/shared/ui/slider";
import { ScrollArea } from "@/shared/ui/scroll-area";
import type {
  GraphFilters,
  GraphDisplay,
  GraphForces,
  GroupInfo,
} from "../lib/graphSettings";

export interface ControlPanelProps {
  open: boolean;
  onClose: () => void;
  onReset: () => void;
  filters: GraphFilters;
  onFiltersChange: (next: GraphFilters) => void;
  display: GraphDisplay;
  onDisplayChange: (next: GraphDisplay) => void;
  forces: GraphForces;
  onForcesChange: (next: GraphForces) => void;
  /** Re-energize the simulation on demand. */
  onReheat: () => void;
  groups: GroupInfo[];
}

/* ── collapsible section shell (local collapse state only) ───────────────── */

function Section({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border last:border-b-0">
      <Button
        type="button"
        variant="ghost"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex h-auto w-full items-center justify-between gap-2 rounded-none px-0 py-2.5 hover:bg-transparent [&_svg]:size-3.5"
      >
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
        {open ? (
          <ChevronDown className="text-muted-foreground" />
        ) : (
          <ChevronRight className="text-muted-foreground" />
        )}
      </Button>
      {open && <div className="space-y-2 pb-3">{children}</div>}
    </div>
  );
}

/* ── labelled switch row ─────────────────────────────────────────────────── */

function SwitchRow({
  id,
  label,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Label htmlFor={id} className="cursor-pointer text-sm font-normal text-foreground">
        {label}
      </Label>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

/* ── labelled slider row (value read-out) ────────────────────────────────── */

function SliderRow({
  label,
  value,
  min,
  max,
  step = 1,
  suffix,
  onValueChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onValueChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-foreground">{label}</span>
        <span className="tabular-nums text-xs text-muted-foreground">
          {value}
          {suffix}
        </span>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={(vals) => onValueChange(vals[0])}
        aria-label={label}
      />
    </div>
  );
}

/* ── panel ───────────────────────────────────────────────────────────────── */

export function ControlPanel({
  open,
  onClose,
  onReset,
  filters,
  onFiltersChange,
  display,
  onDisplayChange,
  forces,
  onForcesChange,
  onReheat,
  groups,
}: ControlPanelProps) {
  const toggleGroup = (id: string) => {
    const hidden = filters.hiddenGroups.includes(id)
      ? filters.hiddenGroups.filter((g) => g !== id)
      : [...filters.hiddenGroups, id];
    onFiltersChange({ ...filters, hiddenGroups: hidden });
  };

  return (
    <div
      role="region"
      aria-label="Graph controls"
      aria-hidden={!open}
      className={cn(
        "absolute right-3 top-3 z-20 flex max-h-[calc(100%-1.5rem)] w-[292px] flex-col overflow-hidden rounded-xl border border-border bg-card/95 shadow-lg backdrop-blur transition-all duration-200 ease-out",
        open
          ? "translate-x-0 opacity-100"
          : "pointer-events-none translate-x-4 opacity-0",
      )}
    >
      {/* header */}
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
        <span className="text-sm font-semibold text-foreground">Controls</span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onReset}
            aria-label="Reset controls to defaults"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close controls"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* scrollable body */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="px-3">
          {/* Search */}
          <Section title="Search">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={filters.query}
                onChange={(e) =>
                  onFiltersChange({ ...filters, query: e.target.value })
                }
                placeholder="Search nodes…"
                aria-label="Search nodes"
                className="h-8 pl-8 pr-8 text-sm"
              />
              {filters.query && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => onFiltersChange({ ...filters, query: "" })}
                  aria-label="Clear search"
                  className="absolute right-0.5 top-1/2 h-6 w-6 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </Section>

          {/* Filters */}
          <Section title="Filters">
            <SwitchRow
              id="graph-filter-tags"
              label="Tags"
              checked={filters.showTags}
              onCheckedChange={(v) =>
                onFiltersChange({ ...filters, showTags: v })
              }
            />
            <SwitchRow
              id="graph-filter-databases"
              label="Databases"
              checked={filters.showDatabases}
              onCheckedChange={(v) =>
                onFiltersChange({ ...filters, showDatabases: v })
              }
            />
            <SwitchRow
              id="graph-filter-ghosts"
              label="Unresolved"
              checked={filters.showGhosts}
              onCheckedChange={(v) =>
                onFiltersChange({ ...filters, showGhosts: v })
              }
            />
            <SwitchRow
              id="graph-filter-orphans"
              label="Orphans"
              checked={filters.showOrphans}
              onCheckedChange={(v) =>
                onFiltersChange({ ...filters, showOrphans: v })
              }
            />
          </Section>

          {/* Groups (collapsed by default) */}
          <Section title="Groups" defaultOpen={false}>
            {groups.length === 0 ? (
              <p className="text-xs text-muted-foreground">No groups yet.</p>
            ) : (
              <div className="grid grid-cols-2 gap-1.5">
                {groups.map((g) => {
                  const on = !filters.hiddenGroups.includes(g.id);
                  return (
                    <Button
                      key={g.id}
                      type="button"
                      variant={on ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => toggleGroup(g.id)}
                      aria-pressed={on}
                      className={cn(
                        "h-auto justify-start gap-1.5 px-2 py-1.5 text-xs font-normal",
                        !on && "text-muted-foreground opacity-60",
                      )}
                    >
                      {g.icon && (
                        <span aria-hidden className="shrink-0 text-sm leading-none">
                          {g.icon}
                        </span>
                      )}
                      <span className="truncate">{g.label}</span>
                    </Button>
                  );
                })}
              </div>
            )}
          </Section>

          {/* Display */}
          <Section title="Display">
            <SwitchRow
              id="graph-display-arrows"
              label="Arrows"
              checked={display.arrows}
              onCheckedChange={(v) =>
                onDisplayChange({ ...display, arrows: v })
              }
            />
            <SwitchRow
              id="graph-display-colorgroups"
              label="Colour groups"
              checked={display.colorGroups}
              onCheckedChange={(v) =>
                onDisplayChange({ ...display, colorGroups: v })
              }
            />
            <SliderRow
              label="Text fade"
              value={display.textFade}
              min={0}
              max={100}
              onValueChange={(v) =>
                onDisplayChange({ ...display, textFade: v })
              }
            />
            <SliderRow
              label="Node size"
              value={display.nodeSize}
              min={70}
              max={145}
              onValueChange={(v) =>
                onDisplayChange({ ...display, nodeSize: v })
              }
            />
            <SliderRow
              label="Link thickness"
              value={display.linkThickness}
              min={60}
              max={240}
              onValueChange={(v) =>
                onDisplayChange({ ...display, linkThickness: v })
              }
            />
          </Section>

          {/* Forces */}
          <Section title="Forces">
            <SliderRow
              label="Center"
              value={forces.center}
              min={0}
              max={100}
              onValueChange={(v) => onForcesChange({ ...forces, center: v })}
            />
            <SliderRow
              label="Repel"
              value={forces.repel}
              min={0}
              max={100}
              onValueChange={(v) => onForcesChange({ ...forces, repel: v })}
            />
            <SliderRow
              label="Link"
              value={forces.link}
              min={0}
              max={100}
              onValueChange={(v) => onForcesChange({ ...forces, link: v })}
            />
            <SliderRow
              label="Link distance"
              value={forces.linkDistance}
              min={80}
              max={260}
              suffix="px"
              onValueChange={(v) =>
                onForcesChange({ ...forces, linkDistance: v })
              }
            />
            <Button
              type="button"
              variant={forces.animate ? "default" : "outline"}
              size="sm"
              onClick={() =>
                onForcesChange({ ...forces, animate: !forces.animate })
              }
              aria-pressed={forces.animate}
              className="mt-1 w-full gap-1.5"
            >
              {forces.animate ? (
                <Pause className="h-3.5 w-3.5" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
              {forces.animate ? "Pause" : "Animate"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onReheat}
              className="w-full gap-1.5"
            >
              <Flame className="h-3.5 w-3.5" />
              Reheat
            </Button>
          </Section>
        </div>
      </ScrollArea>
    </div>
  );
}
