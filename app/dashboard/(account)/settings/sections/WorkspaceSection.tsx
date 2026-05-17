"use client";

import { useId } from "react";
import { useStore } from "@/shared/lib/store";
import { IconPickerPopover, DynamicIcon } from "@/shared/components/icon-picker";
import { Field } from "@/shared/components/forms/Field";
import { useDebouncedCommit } from "@/shared/hooks/useDebouncedCommit";
import { Button } from "@/shared/ui/button";
import { WorkspacesSection as WorkspaceList } from "../WorkspacesSection";

export function WorkspaceSection() {
  const { workspace, updateWorkspace } = useStore();
  const wsNameId = useId();
  const [wsName, setWsName, flushWsName] = useDebouncedCommit(
    workspace.name,
    (v) => updateWorkspace({ name: v.trim() || workspace.name }),
  );

  return (
    <div className="space-y-6">
      <WorkspaceList />
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Current workspace
        </h2>
        <Field label="Workspace name" htmlFor={wsNameId}>
          <input
            id={wsNameId}
            value={wsName}
            onChange={(e) => setWsName(e.target.value)}
            onBlur={flushWsName}
            maxLength={80}
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </Field>
        <Field label="Workspace icon">
          <IconPickerPopover
            value={workspace.emoji}
            onChange={(emoji) => updateWorkspace({ emoji })}
          >
            <Button
              type="button"
              variant="outline"
              className="h-12 w-12 p-0 rounded-md text-2xl font-normal"
              aria-label="Change workspace icon"
            >
              <DynamicIcon value={workspace.emoji} className="text-2xl" />
            </Button>
          </IconPickerPopover>
        </Field>
      </div>
    </div>
  );
}
