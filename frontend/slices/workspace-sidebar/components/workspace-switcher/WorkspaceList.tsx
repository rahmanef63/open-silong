import { Check, Plus, Pencil, LogOut, Trash2, Users } from "lucide-react";
import type { Workspace } from "@/shared/types/domain";
import {
  DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/shared/ui/dropdown-menu";
import { DynamicIcon } from "@/shared/components/icon-picker";

export function WorkspaceList({
  workspaces, active, isOwner, canDelete, canLeave,
  onPick, onCreate, onEdit, onMembers, onDelete, onLeave,
}: {
  workspaces: Workspace[];
  active: Workspace;
  isOwner: boolean;
  canDelete: boolean;
  canLeave: boolean;
  onPick: (id: string) => void;
  onCreate: () => void;
  onEdit: () => void;
  onMembers: () => void;
  onDelete: () => void;
  onLeave: () => void;
}) {
  return (
    <DropdownMenuContent
      className="w-(--radix-dropdown-menu-trigger-width) min-w-64 rounded-lg"
      align="start"
      side="bottom"
      sideOffset={4}
    >
      <DropdownMenuLabel className="text-xs text-muted-foreground">Workspaces</DropdownMenuLabel>
      {workspaces.length === 0 && (
        <DropdownMenuItem className="gap-2 p-2" disabled>
          <span className="text-xs text-muted-foreground">Loading…</span>
        </DropdownMenuItem>
      )}
      {workspaces.map((w) => {
        const isActive = w.id === active.id;
        return (
          <DropdownMenuItem
            key={w.id}
            className="gap-2 p-2"
            onSelect={() => onPick(w.id)}
          >
            <div className="flex size-7 items-center justify-center rounded-md bg-brand/15 text-sm">
              <DynamicIcon value={w.emoji} className="text-sm" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{w.name}</span>
              <span className="truncate text-xs text-muted-foreground">
                {w.isPersonal ? "Personal" : w.role === "owner" ? "Owner" : w.role === "editor" ? "Editor" : "Viewer"}
              </span>
            </div>
            {isActive && <Check className="size-4 text-success" />}
          </DropdownMenuItem>
        );
      })}
      <DropdownMenuSeparator />
      <DropdownMenuItem className="gap-2 p-2" onSelect={onCreate}>
        <div className="flex size-6 items-center justify-center rounded-md border bg-background">
          <Plus className="size-3.5" />
        </div>
        <span className="font-medium">New workspace…</span>
      </DropdownMenuItem>
      {isOwner && (
        <DropdownMenuItem className="gap-2 p-2" onSelect={onEdit}>
          <div className="flex size-6 items-center justify-center rounded-md border bg-background">
            <Pencil className="size-3.5" />
          </div>
          <span className="font-medium">Rename current…</span>
        </DropdownMenuItem>
      )}
      {isOwner && (
        <DropdownMenuItem className="gap-2 p-2" onSelect={onMembers}>
          <div className="flex size-6 items-center justify-center rounded-md border bg-background">
            <Users className="size-3.5" />
          </div>
          <span className="font-medium">Members &amp; invites…</span>
        </DropdownMenuItem>
      )}
      {canDelete && (
        <DropdownMenuItem
          className="gap-2 p-2 text-danger focus:text-danger"
          onSelect={onDelete}
        >
          <div className="flex size-6 items-center justify-center rounded-md border bg-background">
            <Trash2 className="size-3.5" />
          </div>
          <span className="font-medium">Delete workspace</span>
        </DropdownMenuItem>
      )}
      {canLeave && (
        <DropdownMenuItem className="gap-2 p-2" onSelect={onLeave}>
          <div className="flex size-6 items-center justify-center rounded-md border bg-background">
            <LogOut className="size-3.5" />
          </div>
          <span className="font-medium">Leave workspace</span>
        </DropdownMenuItem>
      )}
    </DropdownMenuContent>
  );
}
