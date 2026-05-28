"use client";

import { useState, type KeyboardEvent } from "react";
import {
  ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogHeader,
  ResponsiveDialogTitle, ResponsiveDialogFooter,
} from "@/shared/ui/responsive-dialog";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";
import { parseCaptureInput, isEmptyCapture, captureTitleOrDefault } from "../lib/captureInput";
import type { CaptureInput } from "../types";

export interface QuickCaptureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the parsed capture on submit. Consumer wires this to a
   *  create-page mutation (title + markdown body → markdownToBlocks).
   *  Returns a promise so the dialog can show a pending state. */
  onCapture: (input: CaptureInput) => void | Promise<void>;
}

/** Quick-capture modal shell (Phase 2). Pure presentation + the pure
 *  parse step; the create-page wiring is the consumer's (`onCapture`).
 *  Cmd/Ctrl+Enter submits. Empty input is a no-op. */
export function QuickCaptureDialog({ open, onOpenChange, onCapture }: QuickCaptureDialogProps) {
  const [raw, setRaw] = useState("");
  const [pending, setPending] = useState(false);

  const reset = () => { setRaw(""); setPending(false); };

  const submit = async () => {
    if (isEmptyCapture(raw) || pending) return;
    const parsed = parseCaptureInput(raw);
    const input: CaptureInput = { ...parsed, title: captureTitleOrDefault(parsed) };
    setPending(true);
    try {
      await onCapture(input);
      reset();
      onOpenChange(false);
    } catch {
      setPending(false); // keep the draft so the user can retry
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      void submit();
    }
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}
    >
      <ResponsiveDialogContent size="md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Quick capture</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <Textarea
          autoFocus
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          onKeyDown={onKeyDown}
          rows={6}
          placeholder="First line becomes the title. Everything below is the body (markdown)."
          className="resize-none text-sm"
        />
        <ResponsiveDialogFooter>
          <span className="mr-auto self-center text-[11px] text-muted-foreground">
            ⌘/Ctrl + Enter to save
          </span>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={isEmptyCapture(raw) || pending}>
            {pending ? "Saving…" : "Capture"}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
