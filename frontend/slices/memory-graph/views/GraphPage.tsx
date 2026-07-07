"use client";

/** The graph route body (`/dashboard/graph`) — a dotted-grid surface hosting the
 *  force graph, a control panel (filters/display/forces), an inspector (node
 *  detail), a top bar (controls toggle + Import), and a bottom "Add a memory"
 *  input. Fully theme-token driven. Portable: data + actions arrive via props.
 */

import { useMemo, useState } from "react";
import { SlidersHorizontal, Upload } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { useNavigate } from "@/shared/lib/router";
import { ROUTES } from "@/shared/lib/routes";
import type { Graph, GraphNode } from "@/shared/types/graph";
import { MemoryGraphView } from "../components/MemoryGraphView";
import { ControlPanel } from "../components/ControlPanel";
import { Inspector } from "../components/Inspector";
import { MemoryChatInput } from "../components/MemoryChatInput";
import {
  DEFAULT_DISPLAY,
  DEFAULT_FILTERS,
  DEFAULT_FORCES,
  deriveGroups,
  type GraphDisplay,
  type GraphFilters,
  type GraphForces,
} from "../lib/graphSettings";

export interface MemoryLabels {
  title?: string;
  tagline?: string;
  placeholder?: string;
  helper?: string;
  empty?: string;
  importLabel?: string;
}

const DEFAULTS: Required<MemoryLabels> = {
  title: "Memory",
  tagline: "Learning from every chat",
  placeholder: "Add a memory",
  helper: "Memories are saved as pages in this workspace.",
  empty: "No memories yet — add one below to grow your graph.",
  importLabel: "Import",
};

export interface GraphPageProps {
  model?: Graph;
  onAddChild?: (node: GraphNode) => void;
  onSubmitMemory?: (text: string) => void;
  onImport?: () => void;
  workspaceName?: string;
  labels?: MemoryLabels;
}

export function GraphPage({
  model,
  onAddChild,
  onSubmitMemory,
  onImport,
  labels,
}: GraphPageProps = {}) {
  const l = { ...DEFAULTS, ...labels };
  const navigate = useNavigate();
  const [filters, setFilters] = useState<GraphFilters>(DEFAULT_FILTERS);
  const [display, setDisplay] = useState<GraphDisplay>(DEFAULT_DISPLAY);
  const [forces, setForces] = useState<GraphForces>(DEFAULT_FORCES);
  const [panelOpen, setPanelOpen] = useState(false);
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [focus, setFocus] = useState<{ id: string; nonce: number } | null>(null);

  const groups = useMemo(() => (model ? deriveGroups(model) : []), [model]);
  const hasNodes = !!model && model.nodes.length > 0;
  const reset = () => {
    setFilters(DEFAULT_FILTERS);
    setDisplay(DEFAULT_DISPLAY);
    setForces(DEFAULT_FORCES);
  };

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background">
      {/* dotted grid background — theme-aware via --border */}
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage: "radial-gradient(circle, var(--border) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* top bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between px-5 py-4">
        <span className="text-[15px] font-semibold text-foreground">{l.title}</span>
        <div className="pointer-events-auto flex items-center gap-2">
          <Button
            size="icon"
            variant="secondary"
            className="rounded-full"
            onClick={() => setPanelOpen((o) => !o)}
            aria-label="Graph controls"
            aria-pressed={panelOpen}
          >
            <SlidersHorizontal className="size-4" />
          </Button>
          {onImport ? (
            <Button size="sm" onClick={onImport} className="gap-1.5 rounded-full">
              <Upload className="size-4" />
              {l.importLabel}
            </Button>
          ) : null}
        </div>
      </div>

      {/* graph */}
      <div className="relative z-[5] min-h-0 flex-1">
        {hasNodes ? (
          <MemoryGraphView
            graph={model}
            filters={filters}
            display={display}
            forces={forces}
            selectedId={selected?.id ?? null}
            onSelect={setSelected}
            onAddChild={onAddChild}
            focusTarget={focus}
            className="absolute inset-0"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center p-8 text-center text-sm text-muted-foreground">
            {l.empty}
          </div>
        )}
      </div>

      {/* control panel */}
      <ControlPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        onReset={reset}
        filters={filters}
        onFiltersChange={setFilters}
        display={display}
        onDisplayChange={setDisplay}
        forces={forces}
        onForcesChange={setForces}
        groups={groups}
      />

      {/* inspector */}
      <Inspector
        node={selected}
        onClose={() => setSelected(null)}
        onOpen={(n) => navigate(ROUTES.page(n.id))}
        onFocus={(n) => setFocus((f) => ({ id: n.id, nonce: (f?.nonce ?? 0) + 1 }))}
        onAddChild={(n) => onAddChild?.(n)}
      />

      {/* bottom composer */}
      <div className="absolute inset-x-0 bottom-6 z-20">
        <MemoryChatInput onSubmit={onSubmitMemory} placeholder={l.placeholder} helper={l.helper} />
      </div>
    </div>
  );
}
