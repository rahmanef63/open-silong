"use client";

/** The "Memory" surface — the `/dashboard/graph` route body. A dark canvas with
 *  a dotted grid, a glowing hub + icon-chip / pill nodes (GraphView), a center
 *  title, a top-right Import button, and a bottom "Add a memory" chat input.
 *  Deliberately dark + lime-accented (see lib/memoryTheme), independent of the
 *  app theme. Portable: all data + actions arrive via props from the host.
 */

import { Upload } from "lucide-react";
import type { Graph, GraphNode } from "@/shared/types/graph";
import { MEM } from "../lib/memoryTheme";
import { GraphView } from "../components/GraphView";
import { MemoryChatInput } from "../components/MemoryChatInput";

export interface GraphPageProps {
  model?: Graph;
  onAddChild?: (node: GraphNode) => void;
  onSubmitMemory?: (text: string) => void;
  onImport?: () => void;
  workspaceName?: string;
}

export function GraphPage({
  model,
  onAddChild,
  onSubmitMemory,
  onImport,
  workspaceName,
}: GraphPageProps = {}) {
  return (
    <div
      className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden"
      style={{ background: MEM.surface }}
    >
      {/* dotted grid background */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle, ${MEM.dot} 1px, transparent 1px)`,
          backgroundSize: "24px 24px",
        }}
      />

      {/* header */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between px-5 py-4">
        <span className="text-[15px] font-semibold" style={{ color: MEM.text }}>
          Memory
        </span>
        {onImport ? (
          <button
            type="button"
            onClick={onImport}
            className="pointer-events-auto flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-transform hover:scale-[1.03]"
            style={{ background: MEM.accent, color: MEM.accentInk }}
          >
            <Upload className="size-4" />
            Import
          </button>
        ) : null}
      </div>

      {/* center title overlay */}
      <div className="pointer-events-none absolute inset-x-0 top-[26%] z-10 flex flex-col items-center text-center">
        <span className="text-xl font-semibold" style={{ color: "rgba(255,255,255,0.9)" }}>
          {workspaceName ? `${workspaceName} memory` : "Memory"}
        </span>
        <span className="text-sm" style={{ color: MEM.muted }}>
          Learning from every chat
        </span>
      </div>

      {/* graph canvas */}
      <div className="relative z-[5] min-h-0 flex-1">
        <GraphView model={model} onAddChild={onAddChild} className="absolute inset-0" />
      </div>

      {/* bottom chat input */}
      <div className="absolute inset-x-0 bottom-6 z-20">
        <MemoryChatInput onSubmit={onSubmitMemory} />
      </div>
    </div>
  );
}
