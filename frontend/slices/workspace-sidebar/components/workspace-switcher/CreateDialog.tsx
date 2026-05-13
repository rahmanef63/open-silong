import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { IconPickerPopover, DynamicIcon } from "@/shared/components/icon-picker";

export function CreateWorkspaceDialog({
  open, onOpenChange, name, emoji, onNameChange, onEmojiChange, onSubmit, pending,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  name: string;
  emoji: string;
  onNameChange: (n: string) => void;
  onEmojiChange: (e: string) => void;
  onSubmit: () => void;
  pending: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              <IconPickerPopover value={emoji} onChange={onEmojiChange}>
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border text-2xl hover:bg-accent transition"
                >
                  <DynamicIcon value={emoji} />
                </button>
              </IconPickerPopover>
            </div>
            <div className="flex-1">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Name</label>
              <Input
                autoFocus
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="Acme team"
                onKeyDown={(e) => { if (e.key === "Enter") onSubmit(); }}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSubmit} disabled={!name.trim() || pending}>
            {pending ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
