"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/shared/lib/store";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";

const PAGE_ICONS = [
  "📄", "📝", "📚", "🚀", "🌱", "🛰️", "🎨", "🧠",
  "🪄", "🌙", "☕", "🔥", "🌊", "✨", "🪐", "🛠️",
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = root page; string = subpage of given parent */
  parentId: string | null;
  /** Submit handler — receives { parentId, title, icon }. Caller drives navigation. */
  onSubmit: (data: { parentId: string | null; title: string; icon: string }) => Promise<void> | void;
}

export function CreatePageDialog({ open, onOpenChange, parentId, onSubmit }: Props) {
  const { getPage } = useStore();
  const parent = parentId ? getPage(parentId) : null;
  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState(PAGE_ICONS[0]);
  const [submitting, setSubmitting] = useState(false);

  // Reset form on open
  useEffect(() => {
    if (open) {
      setTitle("");
      setIcon(PAGE_ICONS[Math.floor(Math.random() * PAGE_ICONS.length)]);
    }
  }, [open]);

  async function handleSubmit() {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onSubmit({ parentId, title: title.trim(), icon });
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{parent ? `New subpage in ${parent.title || "Untitled"}` : "New page"}</DialogTitle>
          <DialogDescription>
            Pick a name and icon. You can always change them later.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Icon</label>
            <div className="flex flex-wrap gap-1">
              {PAGE_ICONS.map((i) => (
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
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground" htmlFor="new-page-title">
              Name
            </label>
            <Input
              id="new-page-title"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Untitled"
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
            {submitting ? "Creating…" : "Create page"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
