"use client";

import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";

const DB_ICONS = [
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
  const [icon, setIcon] = useState(DB_ICONS[0]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setName("");
      setIcon(DB_ICONS[Math.floor(Math.random() * DB_ICONS.length)]);
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
            <div className="flex flex-wrap gap-1">
              {DB_ICONS.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIcon(i)}
                  className={cn(
                    "flex size-9 items-center justify-center rounded-md border text-lg transition",
                    icon === i ? "border-brand bg-brand/10" : "border-border hover:bg-accent",
                  )}
                  aria-pressed={icon === i}
                >
                  {i}
                </button>
              ))}
            </div>
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
