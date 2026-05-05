"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/shared/lib/store";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { ALL_EMOJIS, DynamicIcon, IconPickerPopover } from "@/slices/icon-picker";

const DEFAULT_ICON = "📄";

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
  const [icon, setIcon] = useState<string>(DEFAULT_ICON);
  const [submitting, setSubmitting] = useState(false);

  // Reset form on open
  useEffect(() => {
    if (open) {
      setTitle("");
      setIcon(ALL_EMOJIS[Math.floor(Math.random() * ALL_EMOJIS.length)] ?? DEFAULT_ICON);
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
            <IconPickerPopover value={icon} onChange={setIcon} onClear={() => setIcon(DEFAULT_ICON)}>
              <button
                type="button"
                className="inline-flex h-12 w-12 items-center justify-center rounded-md border border-border text-2xl hover:bg-accent transition"
                aria-label="Change icon"
              >
                <DynamicIcon value={icon} />
              </button>
            </IconPickerPopover>
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
