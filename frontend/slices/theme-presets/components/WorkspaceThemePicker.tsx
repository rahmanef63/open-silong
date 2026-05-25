"use client";

/** WorkspaceThemePicker — owner/editor sets a default tweakcn preset +
 *  mode for the workspace. Stored on `workspaces.themePresetId` +
 *  `themeMode`; applied to every member's session on workspace
 *  activation via WorkspaceThemeBridge. Hover-preview is local-only;
 *  commit persists via convex mutation. */

import { useEffect, useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { ChevronDown, Palette, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { Field } from "@/shared/components/forms/Field";
import { Choice } from "@/shared/components/forms/Choice";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useWorkspaces } from "@/shared/lib/store/hooks";
import {
  groupTweakcnPresets, loadTweakcnRegistry, previewTweakcnPreset, restoreTweakcnPreset,
  type TweakcnPresetGroup, type TweakcnPresetItem, type TweakcnRegistry,
} from "../lib/tweakcn";
import { PresetList } from "./tweakcn/PresetList";

const asWorkspaceId = (s: string): Id<"workspaces"> => s as Id<"workspaces">;

const MODE_OPTIONS = [
  ["light", "Light"], ["dark", "Dark"], ["system", "System"],
] as const satisfies ReadonlyArray<readonly [string, string]>;

export function WorkspaceThemePicker() {
  const { workspace } = useWorkspaces();
  const setTheme = useMutation(api.workspaces.setTheme);
  const [registry, setRegistry] = useState<TweakcnRegistry | null>(null);
  const [open, setOpen] = useState(false);

  const role = workspace.role;
  const canEdit = role === "owner" || role === "editor";
  const presetName = workspace.themePresetId ?? null;
  const mode = workspace.themeMode ?? "system";

  useEffect(() => {
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

  const handleCommitPreset = async (name: string) => {
    if (!canEdit) return;
    try {
      await setTheme({
        workspaceId: asWorkspaceId(workspace.id),
        themePresetId: name,
      });
      setOpen(false);
      toast.success("Workspace theme updated");
    } catch (err) {
      toast.error((err as Error).message || "Failed to set workspace theme");
    }
  };

  const handleClearPreset = async () => {
    if (!canEdit) return;
    try {
      await setTheme({
        workspaceId: asWorkspaceId(workspace.id),
        themePresetId: null,
      });
      void restoreTweakcnPreset();
      toast.success("Workspace theme cleared");
    } catch (err) {
      toast.error((err as Error).message || "Failed to clear workspace theme");
    }
  };

  const handleModeChange = async (next: string) => {
    if (!canEdit) return;
    try {
      await setTheme({
        workspaceId: asWorkspaceId(workspace.id),
        themeMode: next as "light" | "dark" | "system",
      });
    } catch (err) {
      toast.error((err as Error).message || "Failed to set workspace mode");
    }
  };

  return (
    <div className="space-y-4">
      <Field
        label="Workspace theme"
        hint={canEdit
          ? "Members see this on workspace activation. Override locally via Appearance."
          : "Only workspace owner or editor can change."}
      >
        <div className="flex items-center gap-2">
          <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) void restoreTweakcnPreset(); }}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                disabled={!canEdit}
                className="h-9 justify-between gap-2 px-3 text-sm"
              >
                <span className="inline-flex items-center gap-2">
                  <Palette className="h-3.5 w-3.5" />
                  <span className="truncate">
                    {presetName ?? "No default"}
                  </span>
                </span>
                <ChevronDown className="h-3.5 w-3.5 opacity-60" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-72 p-0">
              <div className="flex h-80 flex-col">
                <div className="flex items-center justify-between border-b border-border px-3 py-2">
                  <span className="text-xs font-medium">{presetCount} presets</span>
                  {presetName && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleClearPreset}
                      className="h-6 px-2 text-[11px] text-muted-foreground"
                    >
                      <RotateCcw className="mr-1 h-3 w-3" /> Clear
                    </Button>
                  )}
                </div>
                <PresetList
                  groups={groups}
                  presetName={presetName}
                  onPreview={(n) => void previewTweakcnPreset(n)}
                  onRestore={() => void restoreTweakcnPreset()}
                  onCommit={(n) => void handleCommitPreset(n)}
                />
              </div>
            </PopoverContent>
          </Popover>
          <span className="text-xs text-muted-foreground">
            {presetName ? "shared with members" : "no default — members use their own"}
          </span>
        </div>
      </Field>
      <Field label="Workspace mode" hint={canEdit ? undefined : "Read-only — viewer role"}>
        <Choice
          value={mode}
          onChange={(v) => void handleModeChange(v)}
          options={MODE_OPTIONS}
          disabled={!canEdit}
        />
      </Field>
    </div>
  );
}
