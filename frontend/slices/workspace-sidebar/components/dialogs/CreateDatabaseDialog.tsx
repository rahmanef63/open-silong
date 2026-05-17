"use client";

import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { DynamicIcon, IconPickerPopover } from "@/shared/components/icon-picker";

const DB_DEFAULT_ICON = "🗂️";
const DB_QUICK_PICKS = [
  "🗂️", "📊", "📋", "🗄️", "📒", "📔", "📕", "📗",
  "📘", "📙", "🗃️", "🧾", "🎯", "🧪", "🎚️", "🧮",
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { name: string; icon: string }) => Promise<void> | void;
}

export function CreateDatabaseDialog({ open, onOpenChange, onSubmit }: Props) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<string>(DB_DEFAULT_ICON);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setName("");
      setIcon(DB_QUICK_PICKS[Math.floor(Math.random() * DB_QUICK_PICKS.length)] ?? DB_DEFAULT_ICON);
    }
  }, [open]);

  async function handleSubmit() {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onSubmit({ name: name.trim() || "Untitled database", icon });
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New database</DialogTitle>
          <DialogDescription>
            Track and organise rows. The database opens inside its own page.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Icon</label>
            <IconPickerPopover value={icon} onChange={setIcon} onClear={() => setIcon(DB_DEFAULT_ICON)}>
              <Button
                type="button"
                variant="outline"
                className="h-12 w-12 p-0 rounded-md text-2xl font-normal"
                aria-label="Change icon"
              >
                <DynamicIcon value={icon} fallback={DB_DEFAULT_ICON} />
              </Button>
            </IconPickerPopover>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground" htmlFor="new-db-name">
              Name
            </label>
            <Input
              id="new-db-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Untitled database"
              maxLength={120}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
              }}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Creating…" : "Create database"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
