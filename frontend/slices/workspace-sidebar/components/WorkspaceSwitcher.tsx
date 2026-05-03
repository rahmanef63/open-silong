import { useState } from "react";
import { ChevronsUpDown, Plus, Pencil, Check } from "lucide-react";
import { useStore } from "@/shared/lib/store";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";

const COMMON_EMOJI = ["📓", "🚀", "🎨", "💼", "📚", "🧪", "🌱", "🔥", "🦊", "🪐"];

export function WorkspaceSwitcher() {
  const { workspace, updateWorkspace } = useStore();
  const [editOpen, setEditOpen] = useState(false);
  const [draftName, setDraftName] = useState(workspace.name);
  const [draftEmoji, setDraftEmoji] = useState(workspace.emoji);

  function openEdit() {
    setDraftName(workspace.name);
    setDraftEmoji(workspace.emoji);
    setEditOpen(true);
  }

  function save() {
    if (draftName.trim()) {
      updateWorkspace({ name: draftName.trim(), emoji: draftEmoji });
    }
    setEditOpen(false);
  }

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
                  {workspace.emoji}
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{workspace.name}</span>
                  <span className="truncate text-xs text-muted-foreground">Personal · Free</span>
                </div>
                <ChevronsUpDown className="ml-auto size-4 opacity-60" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-60 rounded-lg"
              align="start"
              side="bottom"
              sideOffset={4}
            >
              <DropdownMenuLabel className="text-xs text-muted-foreground">Workspaces</DropdownMenuLabel>
              <DropdownMenuItem className="gap-2 p-2" disabled>
                <div className="flex size-7 items-center justify-center rounded-md bg-brand/15 text-sm">
                  {workspace.emoji}
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{workspace.name}</span>
                  <span className="truncate text-xs text-muted-foreground">Current · You</span>
                </div>
                <Check className="size-4 text-success" />
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2 p-2" onSelect={openEdit}>
                <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                  <Pencil className="size-3.5" />
                </div>
                <span className="font-medium">Rename workspace…</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 p-2" disabled>
                <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                  <Plus className="size-3.5" />
                </div>
                <span className="font-medium text-muted-foreground">Add workspace (soon)</span>
              </DropdownMenuItem>
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
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Emoji</label>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_EMOJI.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setDraftEmoji(e)}
                    className={`flex size-9 items-center justify-center rounded-md border text-lg transition ${
                      draftEmoji === e ? "border-brand bg-brand/10" : "border-border hover:bg-accent"
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Name</label>
              <Input
                autoFocus
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="My workspace"
                onKeyDown={(e) => {
                  if (e.key === "Enter") save();
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={!draftName.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
