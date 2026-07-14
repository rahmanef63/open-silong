"use client";

/** The graph route body (`/dashboard/graph`) — a dotted-grid surface hosting the
 *  force graph, a control panel (filters/display/forces), an inspector (node
 *  detail), a top bar (controls toggle + Import), and a bottom "Add a memory"
 *  input. Fully theme-token driven. Portable: data + actions arrive via props.
 */

import { useEffect, useMemo, useState } from "react";
import { SlidersHorizontal, Upload, Maximize2 } from "lucide-react";
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

/** localStorage-backed graph prefs — SSR-guarded, spread-merged over the
 *  default so a newly-added field is never undefined from an old stored blob. */
function loadPref<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const v = window.localStorage.getItem(key);
    return v ? { ...fallback, ...(JSON.parse(v) as Partial<T>) } : fallback;
  } catch { return fallback; }
}
function savePref<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota / private mode */ }
}

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
  // Persist the user's tuning across reloads. Spread-merge over DEFAULT_* so a
  // newly-added setting never comes back undefined from an old stored blob.
  const [filters, setFilters] = useState<GraphFilters>(() => loadPref("mg:filters", DEFAULT_FILTERS));
  const [display, setDisplay] = useState<GraphDisplay>(() => loadPref("mg:display", DEFAULT_DISPLAY));
  const [forces, setForces] = useState<GraphForces>(() => loadPref("mg:forces", DEFAULT_FORCES));
  const [panelOpen, setPanelOpen] = useState(false);
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [focus, setFocus] = useState<{ id: string; nonce: number } | null>(null);
  const [reheatNonce, setReheatNonce] = useState(0);
  const [fitNonce, setFitNonce] = useState(0);

  useEffect(() => { savePref("mg:filters", filters); }, [filters]);
  useEffect(() => { savePref("mg:display", display); }, [display]);
  useEffect(() => { savePref("mg:forces", forces); }, [forces]);

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
          {hasNodes && (
            <Button
              size="icon"
              variant="secondary"
              className="rounded-full"
              onClick={() => setFitNonce((n) => n + 1)}
              aria-label="Zoom to fit"
              title="Zoom to fit"
            >
              <Maximize2 className="size-4" />
            </Button>
          )}
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
            reheatNonce={reheatNonce}
            fitNonce={fitNonce}
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
        onReheat={() => setReheatNonce((n) => n + 1)}
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
