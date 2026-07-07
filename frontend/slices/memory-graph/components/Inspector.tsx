"use client";

/** Node detail panel for the memory graph — a small floating card pinned
 *  top-right that surfaces the currently-selected node and its actions.
 *
 *  PRESENTATIONAL / props-driven: no convex, no store, no graph internals.
 *  All data + callbacks arrive via props. Colours are theme tokens only
 *  (bg-popover / border-border / text-foreground / text-primary …) so it
 *  follows light/dark + presets. Slides in when a node is selected and
 *  slides out (retaining its last content) when the selection clears, so the
 *  exit animation never blanks mid-transition.
 */

import { useRef } from "react";
import { ExternalLink, Crosshair, Plus, X } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { DynamicIcon } from "@/shared/components/icon-picker";
import type { GraphNode } from "@/shared/types/graph";

export interface InspectorProps {
  node: GraphNode | null;
  onClose: () => void;
  onOpen: (node: GraphNode) => void; // navigate to the page
  onFocus: (node: GraphNode) => void; // recenter graph on it
  onAddChild: (node: GraphNode) => void;
}

/** Human-friendly label for the small uppercase kicker.
 *  page + hub (or graph core) → "Cluster" · page → "Memory" ·
 *  ghost → "Unresolved" · tag → "Tag". */
function kindLabel(node: GraphNode): string {
  if (node.kind === "tag") return "Tag";
  if (node.kind === "ghost") return "Unresolved";
  if (node.kind === "database") return "Database";
  return node.hub ? "Cluster" : "Memory";
}

export function Inspector({ node, onClose, onOpen, onFocus, onAddChild }: InspectorProps) {
  const open = node !== null;

  // Retain the last selected node so the slide-out keeps its content instead
  // of blanking while the panel animates away.
  const lastNode = useRef<GraphNode | null>(node);
  if (node) lastNode.current = node;
  const n = node ?? lastNode.current;

  const isPage = n?.kind === "page";
  const connections = n ? `${n.degree} connection${n.degree === 1 ? "" : "s"}` : "";

  return (
    <aside
      role="dialog"
      aria-label="Node details"
      aria-hidden={!open}
      className={cn(
        "absolute right-4 top-4 z-30 w-[300px] max-w-[calc(100vw-2rem)]",
        "rounded-2xl border border-border bg-popover/90 p-4 shadow-lg backdrop-blur",
        "transition-all duration-200 ease-out lg:right-[320px]",
        open ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-4 opacity-0",
      )}
    >
      {n ? (
        <>
          {/* kind kicker */}
          <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
            {kindLabel(n)}
          </p>

          {/* title (icon emoji + title) */}
          <h2 className="mt-1 flex items-start gap-2 text-lg font-semibold leading-tight text-foreground">
            {n.icon ? <DynamicIcon value={n.icon} size={22} className="shrink-0" /> : null}
            <span className="min-w-0 break-words">{n.title || "Untitled"}</span>
          </h2>

          {/* derived description */}
          <p className="mt-1 text-xs text-muted-foreground">
            {connections} · {kindLabel(n)}
          </p>

          {/* actions */}
          <div className="mt-4 flex flex-wrap gap-2">
            {isPage ? (
              <Button size="sm" onClick={() => onOpen(n)} className="gap-1.5">
                <ExternalLink className="size-4" />
                Open page
              </Button>
            ) : null}
            <Button size="sm" variant="secondary" onClick={() => onFocus(n)} className="gap-1.5">
              <Crosshair className="size-4" />
              Focus
            </Button>
            {isPage ? (
              <Button size="sm" variant="outline" onClick={() => onAddChild(n)} className="gap-1.5">
                <Plus className="size-4" />
                Add child
              </Button>
            ) : null}
            <Button size="sm" variant="ghost" onClick={onClose} className="gap-1.5">
              <X className="size-4" />
              Close
            </Button>
          </div>
        </>
      ) : null}
    </aside>
  );
}
