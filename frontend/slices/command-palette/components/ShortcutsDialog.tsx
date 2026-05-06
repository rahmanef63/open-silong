"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/shared/ui/dialog";

const SHORTCUTS: Array<{ section: string; rows: Array<[string, string]> }> = [
  {
    section: "Navigation",
    rows: [
      ["⌘ / Ctrl + K", "Search"],
      ["?", "Show this dialog"],
      ["Esc", "Close dialog / clear selection"],
    ],
  },
  {
    section: "Editor — selection",
    rows: [
      ["⌘ / Ctrl + B", "Bold"],
      ["⌘ / Ctrl + I", "Italic"],
      ["⌘ / Ctrl + E", "Inline code"],
      ["⌘ / Ctrl + Shift + X", "Strike-through"],
      ["⌘ / Ctrl + Shift + K", "Link"],
      ["@", "Mention a page"],
    ],
  },
  {
    section: "Editor — block",
    rows: [
      ["/", "Slash menu"],
      ["# space", "Heading 1"],
      ["## space", "Heading 2"],
      ["### space", "Heading 3"],
      ["- space", "Bullet list"],
      ["1. space", "Numbered list"],
      ["[] space", "Todo"],
      ["> space", "Quote"],
      ["``` lang", "Code block"],
      ["$$ space", "Equation"],
      ["--- enter", "Divider"],
    ],
  },
  {
    section: "Editor — input",
    rows: [
      ["Enter", "New block"],
      ["Backspace (empty)", "Delete block / merge up"],
      ["Tab / Shift+Tab", "Indent / outdent"],
      ["⌘ / Ctrl + Z", "Undo"],
      ["⌘ / Ctrl + Shift + Z", "Redo"],
    ],
  },
];

export function ShortcutsDialog() {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Don't fire while typing in fields
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || ["INPUT", "TEXTAREA"].includes(t.tagName))) return;
      if (e.key === "?") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl">
        <DialogTitle>Keyboard shortcuts</DialogTitle>
        <DialogDescription className="sr-only">
          Reference list of every keyboard shortcut Nosion supports.
        </DialogDescription>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {SHORTCUTS.map((s) => (
            <section key={s.section}>
              <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {s.section}
              </h3>
              <ul className="space-y-1">
                {s.rows.map(([keys, label]) => (
                  <li key={keys} className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-muted-foreground">{label}</span>
                    <kbd className="rounded border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-[10px]">
                      {keys}
                    </kbd>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
