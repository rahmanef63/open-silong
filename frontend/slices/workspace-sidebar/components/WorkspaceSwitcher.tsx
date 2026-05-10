import { useState } from "react";
import { ChevronsUpDown, Plus, Pencil, Check, LogOut, Trash2, Users } from "lucide-react";
import { useStore } from "@/shared/lib/store";
import { useAsyncError } from "@/shared/hooks/useAsyncError";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/shared/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { IconPickerPopover, DynamicIcon } from "@/slices/icon-picker";
import { MembersDialog } from "@/slices/workspace-members";

export function WorkspaceSwitcher() {
  const {
    workspace,
    workspaces,
    updateWorkspace,
    setActiveWorkspace,
    createWorkspace,
    deleteWorkspace,
    leaveWorkspace,
  } = useStore();
  const [editOpen, setEditOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [draftName, setDraftName] = useState(workspace.name);
  const [draftEmoji, setDraftEmoji] = useState(workspace.emoji);
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState("📁");

  const switchOp = useAsyncError("workspaceSwitcher.switch");
  const createOp = useAsyncError("workspaceSwitcher.create");
  const deleteOp = useAsyncError("workspaceSwitcher.delete");
  const leaveOp = useAsyncError("workspaceSwitcher.leave");

  const isOwner = workspace.role === "owner";
  const canDelete = isOwner && !workspace.isPersonal;
  const canLeave = !isOwner;

  function openEdit() {
    setDraftName(workspace.name);
    setDraftEmoji(workspace.emoji);
    setEditOpen(true);
  }

  function openCreate() {
    setNewName("");
    setNewEmoji("📁");
    setCreateOpen(true);
  }

  function save() {
    if (draftName.trim()) {
      updateWorkspace({ name: draftName.trim(), emoji: draftEmoji });
    }
    setEditOpen(false);
  }

  async function submitCreate() {
    if (!newName.trim()) return;
    const ok = await createOp.execute(async () => {
      await createWorkspace(newName.trim(), newEmoji);
    });
    if (ok !== undefined) setCreateOpen(false);
  }

  async function onPick(id: string) {
    if (id === workspace.id) return;
    await switchOp.execute(async () => { await setActiveWorkspace(id); });
  }

  async function onDelete() {
    if (!canDelete) return;
    if (!window.confirm(`Delete "${workspace.name}"? Pages and databases inside become unreachable.`)) return;
    await deleteOp.execute(async () => { await deleteWorkspace(workspace.id); });
  }

  async function onLeave() {
    if (!canLeave) return;
    if (!window.confirm(`Leave "${workspace.name}"?`)) return;
    await leaveOp.execute(async () => { await leaveWorkspace(workspace.id); });
  }

  const subtitle = workspace.isPersonal
    ? "Personal · Free"
    : workspace.role === "owner"
      ? "Owner · Free"
      : workspace.role === "editor"
        ? "Editor"
        : "Viewer";

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-brand/15 text-base">
                  <DynamicIcon value={workspace.emoji} className="text-base" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-semibold">{workspace.name}</span>
                  <span className="truncate text-xs text-muted-foreground">{subtitle}</span>
                </div>
                <ChevronsUpDown className="ml-auto size-4 opacity-60 group-data-[collapsible=icon]:hidden" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
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
                const active = w.id === workspace.id;
                return (
                  <DropdownMenuItem
                    key={w.id}
                    className="gap-2 p-2"
                    onSelect={() => { void onPick(w.id); }}
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
                    {active && <Check className="size-4 text-success" />}
                  </DropdownMenuItem>
                );
              })}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2 p-2" onSelect={openCreate}>
                <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                  <Plus className="size-3.5" />
                </div>
                <span className="font-medium">New workspace…</span>
              </DropdownMenuItem>
              {isOwner && (
                <DropdownMenuItem className="gap-2 p-2" onSelect={openEdit}>
                  <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                    <Pencil className="size-3.5" />
                  </div>
                  <span className="font-medium">Rename current…</span>
                </DropdownMenuItem>
              )}
              {isOwner && (
                <DropdownMenuItem className="gap-2 p-2" onSelect={() => setMembersOpen(true)}>
                  <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                    <Users className="size-3.5" />
                  </div>
                  <span className="font-medium">Members &amp; invites…</span>
                </DropdownMenuItem>
              )}
              {canDelete && (
                <DropdownMenuItem
                  className="gap-2 p-2 text-danger focus:text-danger"
                  onSelect={() => { void onDelete(); }}
                >
                  <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                    <Trash2 className="size-3.5" />
                  </div>
                  <span className="font-medium">Delete workspace</span>
                </DropdownMenuItem>
              )}
              {canLeave && (
                <DropdownMenuItem
                  className="gap-2 p-2"
                  onSelect={() => { void onLeave(); }}
                >
                  <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                    <LogOut className="size-3.5" />
                  </div>
                  <span className="font-medium">Leave workspace</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename workspace</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-end gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Icon</label>
                <IconPickerPopover value={draftEmoji} onChange={setDraftEmoji}>
                  <button
                    type="button"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border text-2xl hover:bg-accent transition"
                  >
                    <DynamicIcon value={draftEmoji} />
                  </button>
                </IconPickerPopover>
              </div>
              <div className="flex-1">
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Name</label>
                <Input
                  autoFocus
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  placeholder="My workspace"
                  onKeyDown={(e) => { if (e.key === "Enter") save(); }}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={!draftName.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New workspace</DialogTitle>
            <DialogDescription>
              Workspaces keep pages and databases separate. You can switch between
              them from the sidebar.
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

      <MembersDialog open={membersOpen} onOpenChange={setMembersOpen} workspace={workspace} />
    </>
  );
}
