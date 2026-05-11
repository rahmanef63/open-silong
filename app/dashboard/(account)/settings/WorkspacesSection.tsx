"use client";

import { useState } from "react";
import { Check, LogOut, Plus, Trash2, Users } from "lucide-react";
import { useStore } from "@/shared/lib/store";
import { useAsyncError } from "@/shared/hooks/useAsyncError";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/shared/ui/dialog";
import { IconPickerPopover, DynamicIcon } from "@/shared/components/icon-picker";
import { MembersDialog } from "@/slices/workspace-members";
import type { Workspace } from "@/shared/types/domain";

export function WorkspacesSection() {
  const {
    workspace, workspaces, setActiveWorkspace, createWorkspace, deleteWorkspace, leaveWorkspace,
  } = useStore();
  const [membersFor, setMembersFor] = useState<Workspace | null>(null);
  const switchOp = useAsyncError("settings.workspaces.switch");
  const createOp = useAsyncError("settings.workspaces.create");
  const deleteOp = useAsyncError("settings.workspaces.delete");
  const leaveOp = useAsyncError("settings.workspaces.leave");
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState("📁");

  async function submitCreate() {
    if (!newName.trim()) return;
    const ok = await createOp.execute(async () => { await createWorkspace(newName.trim(), newEmoji); });
    if (ok !== undefined) {
      setCreateOpen(false);
      setNewName("");
      setNewEmoji("📁");
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Workspaces keep separate sets of pages and databases. Your personal
        workspace cannot be deleted. Owners can mint single-use invite links
        from the <strong>Members</strong> button — anyone with the link joins
        the workspace as an editor or viewer.
      </p>

      <div className="space-y-2">
        {workspaces.length === 0 && (
          <div className="text-sm text-muted-foreground">Loading…</div>
        )}
        {workspaces.map((w) => {
          const active = w.id === workspace.id;
          const isOwner = w.role === "owner";
          const canDelete = isOwner && !w.isPersonal;
          const canLeave = !isOwner;
          return (
            <div
              key={w.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
            >
              <div className="flex size-10 items-center justify-center rounded-lg bg-brand/15 text-lg">
                <DynamicIcon value={w.emoji} className="text-lg" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{w.name}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {w.isPersonal ? "Personal · " : ""}{w.role === "owner" ? "Owner" : w.role === "editor" ? "Editor" : "Viewer"}
                  {w.slug ? ` · /${w.slug}` : ""}
                </div>
              </div>
              {active ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[11px] text-success">
                  <Check className="h-3 w-3" /> Active
                </span>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={switchOp.pending}
                  onClick={() => void switchOp.execute(async () => { await setActiveWorkspace(w.id); })}
                >
                  Switch
                </Button>
              )}
              {isOwner && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setMembersFor(w)}
                  title="Manage members + invites"
                >
                  <Users className="h-3.5 w-3.5" />
                </Button>
              )}
              {canDelete && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={deleteOp.pending}
                  onClick={async () => {
                    if (!window.confirm(`Delete "${w.name}"? Pages and databases inside become unreachable.`)) return;
                    await deleteOp.execute(async () => { await deleteWorkspace(w.id); });
                  }}
                  title="Delete workspace"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
              {canLeave && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={leaveOp.pending}
                  onClick={async () => {
                    if (!window.confirm(`Leave "${w.name}"?`)) return;
                    await leaveOp.execute(async () => { await leaveWorkspace(w.id); });
                  }}
                  title="Leave workspace"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> New workspace
        </Button>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New workspace</DialogTitle>
            <DialogDescription>
              Workspaces keep pages and databases separate. You can switch
              between them from the sidebar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-end gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Icon</label>
                <IconPickerPopover value={newEmoji} onChange={setNewEmoji}>
                  <button
                    type="button"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border text-2xl hover:bg-accent transition"
                  >
                    <DynamicIcon value={newEmoji} />
                  </button>
                </IconPickerPopover>
              </div>
              <div className="flex-1">
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Name</label>
                <Input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Acme team"
                  onKeyDown={(e) => { if (e.key === "Enter") void submitCreate(); }}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => void submitCreate()} disabled={!newName.trim() || createOp.pending}>
              {createOp.pending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {membersFor && (
        <MembersDialog
          open={!!membersFor}
          onOpenChange={(o) => { if (!o) setMembersFor(null); }}
          workspace={membersFor}
        />
      )}
    </div>
  );
}
