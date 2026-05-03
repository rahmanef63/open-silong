"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/shared/lib/utils";

/**
 * Minimal three-column layout shell — adapted from
 * `~/projects/resources/cookbook/layouts/dashboard-three-column`.
 *
 * Responsibilities (LAYOUT ONLY — no resize, no persistence, no presets):
 *  - desktop (≥md): left | center | right in a flex row
 *  - mobile (<md): center fills viewport; left/right hidden (consumers use
 *    their own mobile nav — Nosion has MobileBottomNav + SidebarProvider sheet)
 *  - left/right may be collapsed via the floating chevron buttons on desktop
 *  - omit a side panel by passing `null` / `undefined` for that slot
 */

interface ThreeColumnLayoutProps {
  left?: React.ReactNode;
  center: React.ReactNode;
  right?: React.ReactNode;
  /** Pixel width of the left column when expanded. Default 280. */
  leftWidth?: number;
  /** Pixel width of the right column when expanded. Default 360. */
  rightWidth?: number;
  /** Hide the toggle chevrons. Default false. */
  hideToggle?: boolean;
  defaultLeftCollapsed?: boolean;
  defaultRightCollapsed?: boolean;
  className?: string;
}

export function ThreeColumnLayout({
  left,
  center,
  right,
  leftWidth = 280,
  rightWidth = 360,
  hideToggle = false,
  defaultLeftCollapsed = false,
  defaultRightCollapsed = false,
  className,
}: ThreeColumnLayoutProps) {
  const [leftCollapsed, setLeftCollapsed] = React.useState(defaultLeftCollapsed);
  const [rightCollapsed, setRightCollapsed] = React.useState(defaultRightCollapsed);

  // Cmd/Ctrl + B → toggle left
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setLeftCollapsed((v) => !v);
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setRightCollapsed((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const showLeft = !!left;
  const showRight = !!right;

  return (
    <div className={cn("flex h-full min-h-0 w-full bg-background", className)}>
      {/* LEFT */}
      {showLeft && (
        <aside
          aria-label="Sidebar"
          className={cn(
            "hidden md:flex shrink-0 border-r border-border bg-sidebar text-sidebar-foreground",
            "transition-[width] duration-200 ease-out overflow-hidden",
          )}
          style={{ width: leftCollapsed ? 0 : leftWidth }}
        >
          <div className="h-full w-full overflow-y-auto" style={{ minWidth: leftWidth }}>
            {left}
          </div>
        </aside>
      )}

      {/* CENTER */}
      <main className="relative flex-1 min-w-0 flex flex-col">
        {showLeft && !hideToggle && (
          <button
            type="button"
            aria-label={leftCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setLeftCollapsed((v) => !v)}
            className="hidden md:grid place-items-center absolute left-0 top-1/2 -translate-y-1/2 z-20 h-12 w-4 rounded-r border border-l-0 border-border bg-background hover:bg-accent text-muted-foreground hover:text-foreground transition"
          >
            {leftCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
          </button>
        )}
        <div className="flex-1 min-h-0 min-w-0 flex flex-col">{center}</div>
      </main>

      {/* RIGHT */}
      {showRight && (
        <aside
          aria-label="Inspector"
          className={cn(
            "hidden lg:flex shrink-0 border-l border-border bg-card",
            "transition-[width] duration-200 ease-out overflow-hidden",
          )}
          style={{ width: rightCollapsed ? 0 : rightWidth }}
        >
          <div className="h-full w-full overflow-y-auto" style={{ minWidth: rightWidth }}>
            {right}
          </div>
        </aside>
      )}
      {showRight && !hideToggle && (
        <button
          type="button"
          aria-label={rightCollapsed ? "Expand inspector" : "Collapse inspector"}
          onClick={() => setRightCollapsed((v) => !v)}
          className={cn(
            "hidden lg:grid place-items-center fixed top-1/2 -translate-y-1/2 z-20 h-12 w-4 rounded-l border border-r-0 border-border bg-background hover:bg-accent text-muted-foreground hover:text-foreground transition",
          )}
          style={{ right: rightCollapsed ? 0 : rightWidth }}
        >
          {rightCollapsed ? <ChevronLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </button>
      )}
    </div>
  );
}
