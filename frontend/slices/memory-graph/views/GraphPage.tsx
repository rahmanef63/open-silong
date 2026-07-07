"use client";

/** The graph route body (`/dashboard/graph`) — a dotted-grid surface with the
 *  force graph (GraphView), a center title, a top-right Import button, and a
 *  bottom "Add a memory" input. Fully THEME-DYNAMIC (theme tokens only, no
 *  fixed colours) so it follows light/dark + presets. Portable: all data,
 *  actions, and copy arrive via props from the host.
 */

import { Upload } from "lucide-react";
import { Button } from "@/shared/ui/button";
import type { Graph, GraphNode } from "@/shared/types/graph";
import { GraphView } from "../components/GraphView";
import { MemoryChatInput } from "../components/MemoryChatInput";

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
  workspaceName,
  labels,
}: GraphPageProps = {}) {
  const l = { ...DEFAULTS, ...labels };

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background">
      {/* dotted grid background — theme-aware via the --border token */}
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage: "radial-gradient(circle, var(--border) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* header */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between px-5 py-4">
        <span className="text-[15px] font-semibold text-foreground">{l.title}</span>
        {onImport ? (
          <Button size="sm" onClick={onImport} className="pointer-events-auto gap-1.5 rounded-full">
            <Upload className="size-4" />
            {l.importLabel}
          </Button>
        ) : null}
      </div>

      {/* center title overlay */}
      <div className="pointer-events-none absolute inset-x-0 top-[26%] z-10 flex flex-col items-center text-center">
        <span className="text-xl font-semibold text-foreground">
          {workspaceName ? `${workspaceName} memory` : l.title}
        </span>
        <span className="text-sm text-muted-foreground">{l.tagline}</span>
      </div>

      {/* graph canvas */}
      <div className="relative z-[5] min-h-0 flex-1">
        <GraphView model={model} onAddChild={onAddChild} emptyLabel={l.empty} className="absolute inset-0" />
      </div>

      {/* bottom chat input */}
      <div className="absolute inset-x-0 bottom-6 z-20">
        <MemoryChatInput onSubmit={onSubmitMemory} placeholder={l.placeholder} helper={l.helper} />
      </div>
    </div>
  );
}
