"use client";

/** WorkspaceThemeBridge — applies the active workspace's default theme
 *  (preset + mode) on workspace activation. Mounted once in
 *  DashboardShell; renders nothing.
 *
 *  Loop-avoidance: tracks the last workspace id we applied for in a
 *  ref. We re-apply only when the workspace id flips (switch event),
 *  not on every render. Within a workspace session, the user's manual
 *  Appearance changes via next-themes / tweakcn stick — switching away
 *  and back resets to workspace default. */

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { useWorkspaces } from "@/shared/lib/store/hooks";
import { applyTweakcnPreset } from "../lib/tweakcn";

export function WorkspaceThemeBridge() {
  const { workspace } = useWorkspaces();
  const { setTheme } = useTheme();
  const lastAppliedRef = useRef<string | null>(null);

  useEffect(() => {
    const id = workspace.id;
    // Skip the synthetic "local" id rendered before the convex query
    // resolves — bridge applies only for real workspaces.
    if (!id || id === "local") return;
    if (lastAppliedRef.current === id) return;
    lastAppliedRef.current = id;

    // Apply workspace defaults if owner set them. When absent, leave
    // the user's existing local preferences alone.
    if (workspace.themePresetId) {
      void applyTweakcnPreset(workspace.themePresetId);
    }
    if (workspace.themeMode) {
      setTheme(workspace.themeMode);
    }
  }, [workspace.id, workspace.themePresetId, workspace.themeMode, setTheme]);

  return null;
}
